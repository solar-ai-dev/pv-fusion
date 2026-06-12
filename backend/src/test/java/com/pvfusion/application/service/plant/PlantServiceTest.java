package com.pvfusion.application.service.plant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.plant.CreatePlantCommand;
import com.pvfusion.application.dto.plant.DeactivatePlantCommand;
import com.pvfusion.application.dto.plant.GetPlantQuery;
import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.application.dto.plant.UpdatePlantCommand;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlantServiceTest {

    @Mock
    private CurrentUserPort currentUserPort;
    @Mock
    private UserRepositoryPort userRepositoryPort;
    @Mock
    private PlantRepositoryPort plantRepositoryPort;
    @Mock
    private PlantMemberRepositoryPort plantMemberRepositoryPort;
    @Mock
    private RecordOperationLogUseCase recordOperationLogUseCase;

    private PlantService plantService;

    @BeforeEach
    void setUp() {
        plantService = new PlantService(
                currentUserPort,
                userRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                recordOperationLogUseCase
        );
    }

    @Test
    void createsPlantAndRegistersCreatorAsOwner() {
        User user = approvedUser(1L, UserRole.USER);
        Plant savedPlant = plant(10L, "새 발전소", ResourceStatus.ACTIVE, 1L);

        stubCurrentUser(user);
        when(plantRepositoryPort.save(any(Plant.class))).thenReturn(savedPlant);
        when(plantRepositoryPort.countZonesByPlantId(10L)).thenReturn(0L);
        when(plantRepositoryPort.findLatestInspectionAtByPlantId(10L)).thenReturn(null);
        when(plantMemberRepositoryPort.save(any(PlantMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = plantService.execute(new CreatePlantCommand(null, "새 발전소", "서울", "설명"));

        ArgumentCaptor<PlantMember> captor = ArgumentCaptor.forClass(PlantMember.class);
        verify(plantMemberRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getMemberRole()).isEqualTo(PlantMemberRole.OWNER);
        assertThat(captor.getValue().getUserId()).isEqualTo(1L);
        assertThat(response.plantId()).isEqualTo(10L);
        assertThat(response.createdByUserId()).isEqualTo(1L);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void queriesPlantsUsingCurrentUserIdForApprovedUser() {
        User user = approvedUser(2L, UserRole.USER);
        PageResponse<PlantSummaryResponse> page = PageResponse.of(
                List.of(new PlantSummaryResponse(1L, "A", "Seoul", ResourceStatus.ACTIVE, 0L, null)),
                0,
                20,
                1,
                1,
                false
        );

        stubCurrentUser(user);
        when(plantRepositoryPort.findAll(any(PlantListQuery.class))).thenReturn(page);

        plantService.execute(new PlantListQuery(null, "A", ResourceStatus.ACTIVE, 0, 20));

        ArgumentCaptor<PlantListQuery> captor = ArgumentCaptor.forClass(PlantListQuery.class);
        verify(plantRepositoryPort).findAll(captor.capture());
        assertThat(captor.getValue().actorUserId()).isEqualTo(2L);
    }

    @Test
    void rejectsPlantDetailWhenUserHasNoAccess() {
        User user = approvedUser(2L, UserRole.USER);
        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L, "A", ResourceStatus.ACTIVE, 1L)));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> plantService.execute(new GetPlantQuery(null, 10L)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void updatesPlantForManagerMember() {
        User user = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, "기존", ResourceStatus.ACTIVE, 1L);
        Plant updatedPlant = plant.update("변경", "부산", "새 설명");

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(plantRepositoryPort.save(any(Plant.class))).thenReturn(updatedPlant);
        when(plantRepositoryPort.countZonesByPlantId(10L)).thenReturn(1L);
        when(plantRepositoryPort.findLatestInspectionAtByPlantId(10L)).thenReturn(null);

        var response = plantService.execute(new UpdatePlantCommand(null, 10L, "변경", "부산", "새 설명"));

        assertThat(response.name()).isEqualTo("변경");
        assertThat(response.location()).isEqualTo("부산");
    }

    @Test
    @DisplayName("BE-UNIT-PLANT-005 발전소 비활성화는 상태를 INACTIVE로 변경한다")
    void deactivatesPlantForAdmin() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Plant activePlant = plant(10L, "A", ResourceStatus.ACTIVE, 1L);
        Plant deactivatedPlant = activePlant.deactivate();

        stubCurrentUser(admin);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(activePlant));
        when(plantRepositoryPort.save(any(Plant.class))).thenReturn(deactivatedPlant);
        when(plantRepositoryPort.countZonesByPlantId(10L)).thenReturn(0L);
        when(plantRepositoryPort.findLatestInspectionAtByPlantId(10L)).thenReturn(null);

        var response = plantService.execute(new DeactivatePlantCommand(null, 10L));

        assertThat(response.status()).isEqualTo(ResourceStatus.INACTIVE);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void rejectsDeactivationForAlreadyInactivePlant() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        stubCurrentUser(admin);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L, "A", ResourceStatus.INACTIVE, 1L)));

        assertThatThrownBy(() -> plantService.execute(new DeactivatePlantCommand(null, 10L)))
                .isInstanceOf(DuplicateResourceException.class);
        verify(plantRepositoryPort, times(0)).save(any());
    }

    private void stubCurrentUser(User user) {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(user.getId()));
        when(userRepositoryPort.findById(user.getId())).thenReturn(Optional.of(user));
    }

    private User approvedUser(Long id, UserRole role) {
        OffsetDateTime now = now();
        return new User(
                id,
                "user" + id + "@example.com",
                "User " + id,
                "GOOGLE",
                "google-" + id,
                role,
                AccountStatus.APPROVED,
                now.minusDays(1),
                now.minusDays(10),
                now.minusDays(1)
        );
    }

    private Plant plant(Long id, String name, ResourceStatus status, Long createdByUserId) {
        OffsetDateTime now = now();
        return new Plant(id, name, "서울", "설명", status, createdByUserId, now.minusDays(5), now.minusDays(1));
    }

    private PlantMember member(Long id, Long plantId, Long userId, PlantMemberRole role, ResourceStatus status) {
        OffsetDateTime now = now();
        return new PlantMember(id, plantId, userId, role, status, now.minusDays(5), now.minusDays(1));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
    }
}
