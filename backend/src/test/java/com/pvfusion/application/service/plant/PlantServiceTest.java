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
    @DisplayName("BE-UNIT-PLANT-001 creates active plant and owner membership for creator")
    void createsPlantAndRegistersCreatorAsOwner() {
        User user = approvedUser(1L, UserRole.USER);
        Plant savedPlant = plant(10L, "Plant-A", ResourceStatus.ACTIVE, 1L);

        stubCurrentUser(user);
        when(plantRepositoryPort.save(any(Plant.class))).thenReturn(savedPlant);
        when(plantRepositoryPort.countZonesByPlantId(10L)).thenReturn(0L);
        when(plantRepositoryPort.findLatestInspectionAtByPlantId(10L)).thenReturn(null);
        when(plantMemberRepositoryPort.save(any(PlantMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = plantService.execute(new CreatePlantCommand(null, "Plant-A", "Seoul", "desc"));

        ArgumentCaptor<PlantMember> captor = ArgumentCaptor.forClass(PlantMember.class);
        verify(plantMemberRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getMemberRole()).isEqualTo(PlantMemberRole.OWNER);
        assertThat(captor.getValue().getUserId()).isEqualTo(1L);
        assertThat(captor.getValue().getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(response.plantId()).isEqualTo(10L);
        assertThat(response.createdByUserId()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo(ResourceStatus.ACTIVE);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    @DisplayName("BE-UNIT-PLANT-002 limits list query to current approved user scope")
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
    @DisplayName("Admin queries all plants without actor restriction")
    void adminQueriesPlantsWithoutActorRestriction() {
        User admin = approvedUser(99L, UserRole.ADMIN);
        PageResponse<PlantSummaryResponse> page = PageResponse.of(List.of(), 0, 20, 0, 0, false);

        stubCurrentUser(admin);
        when(plantRepositoryPort.findAll(any(PlantListQuery.class))).thenReturn(page);

        plantService.execute(new PlantListQuery("Plant", ResourceStatus.ACTIVE, 0, 20));

        ArgumentCaptor<PlantListQuery> captor = ArgumentCaptor.forClass(PlantListQuery.class);
        verify(plantRepositoryPort).findAll(captor.capture());
        assertThat(captor.getValue().actorUserId()).isNull();
        assertThat(captor.getValue().keyword()).isEqualTo("Plant");
        assertThat(captor.getValue().status()).isEqualTo(ResourceStatus.ACTIVE);
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
        Plant plant = plant(10L, "Plant-A", ResourceStatus.ACTIVE, 1L);
        Plant updatedPlant = plant.update("Plant-B", "Busan", "updated");

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(plantRepositoryPort.save(any(Plant.class))).thenReturn(updatedPlant);
        when(plantRepositoryPort.countZonesByPlantId(10L)).thenReturn(1L);
        when(plantRepositoryPort.findLatestInspectionAtByPlantId(10L)).thenReturn(null);

        var response = plantService.execute(new UpdatePlantCommand(null, 10L, "Plant-B", "Busan", "updated"));

        assertThat(response.name()).isEqualTo("Plant-B");
        assertThat(response.location()).isEqualTo("Busan");
    }

    @Test
    @DisplayName("BE-UNIT-PLANT-004 updates only allowed plant fields")
    void updatePlantChangesOnlyEditableFields() {
        User user = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, "Plant-A", ResourceStatus.ACTIVE, 1L);
        OffsetDateTime originalCreatedAt = plant.getCreatedAt();
        OffsetDateTime originalUpdatedAt = plant.getUpdatedAt();

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(plantRepositoryPort.save(any(Plant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(plantRepositoryPort.countZonesByPlantId(10L)).thenReturn(1L);
        when(plantRepositoryPort.findLatestInspectionAtByPlantId(10L)).thenReturn(null);

        plantService.execute(new UpdatePlantCommand(null, 10L, "Plant-B", "Busan", "updated"));

        ArgumentCaptor<Plant> captor = ArgumentCaptor.forClass(Plant.class);
        verify(plantRepositoryPort).save(captor.capture());
        Plant savedPlant = captor.getValue();
        assertThat(savedPlant.getName()).isEqualTo("Plant-B");
        assertThat(savedPlant.getLocation()).isEqualTo("Busan");
        assertThat(savedPlant.getDescription()).isEqualTo("updated");
        assertThat(savedPlant.getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(savedPlant.getCreatedByUserId()).isEqualTo(1L);
        assertThat(savedPlant.getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(savedPlant.getUpdatedAt()).isAfterOrEqualTo(originalUpdatedAt);
    }

    @Test
    @DisplayName("BE-UNIT-PLANT-005 deactivates plant by changing status to inactive")
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
        return new Plant(id, name, "Seoul", "desc", status, createdByUserId, now.minusDays(5), now.minusDays(1));
    }

    private PlantMember member(Long id, Long plantId, Long userId, PlantMemberRole role, ResourceStatus status) {
        OffsetDateTime now = now();
        return new PlantMember(id, plantId, userId, role, status, now.minusDays(5), now.minusDays(1));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
    }
}
