package com.pvfusion.application.service.plant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.user.ChangePlantMemberRoleCommand;
import com.pvfusion.application.dto.user.DeactivatePlantMemberCommand;
import com.pvfusion.application.dto.user.GrantPlantAccessCommand;
import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.application.dto.user.PlantMemberResponse;
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
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlantMemberServiceTest {

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

    private PlantMemberService plantMemberService;

    @BeforeEach
    void setUp() {
        plantMemberService = new PlantMemberService(
                currentUserPort,
                userRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                recordOperationLogUseCase
        );
    }

    @Test
    void queriesPlantMembersForManager() {
        User manager = approvedUser(1L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);
        List<PlantMemberResponse> responses = List.of(
                new PlantMemberResponse(1L, 10L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE, now(), now())
        );

        stubCurrentUser(manager);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(member(9L, 10L, 1L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(plantMemberRepositoryPort.findAll(any())).thenReturn(responses);

        var result = plantMemberService.execute(new PlantMemberListQuery(null, 10L, null, null, ResourceStatus.ACTIVE));

        assertThat(result).hasSize(1);
        verify(plantMemberRepositoryPort).findAll(any());
    }

    @Test
    void grantsPlantAccessToNewMember() {
        User manager = approvedUser(1L, UserRole.USER);
        User target = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(manager);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(member(9L, 10L, 1L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(target));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L)).thenReturn(Optional.empty());
        when(plantMemberRepositoryPort.save(any(PlantMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = plantMemberService.execute(new GrantPlantAccessCommand(null, 10L, 2L, PlantMemberRole.VIEWER));

        assertThat(response.userId()).isEqualTo(2L);
        assertThat(response.memberRole()).isEqualTo(PlantMemberRole.VIEWER);
        assertThat(response.status()).isEqualTo(ResourceStatus.ACTIVE);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void reactivatesInactivePlantMemberOnGrant() {
        User manager = approvedUser(1L, UserRole.USER);
        User target = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);
        PlantMember inactiveMember = member(30L, 10L, 2L, PlantMemberRole.VIEWER, ResourceStatus.INACTIVE);

        stubCurrentUser(manager);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(member(9L, 10L, 1L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(target));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L)).thenReturn(Optional.of(inactiveMember));
        when(plantMemberRepositoryPort.save(any(PlantMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = plantMemberService.execute(new GrantPlantAccessCommand(null, 10L, 2L, PlantMemberRole.MANAGER));

        assertThat(response.plantMemberId()).isEqualTo(30L);
        assertThat(response.memberRole()).isEqualTo(PlantMemberRole.MANAGER);
        assertThat(response.status()).isEqualTo(ResourceStatus.ACTIVE);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void rejectsDuplicateActivePlantMemberGrant() {
        User manager = approvedUser(1L, UserRole.USER);
        User target = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(manager);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(member(9L, 10L, 1L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(target));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));

        assertThatThrownBy(() -> plantMemberService.execute(new GrantPlantAccessCommand(null, 10L, 2L, PlantMemberRole.VIEWER)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void rejectsSelfDemotionOfManageRole() {
        User manager = approvedUser(1L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(manager);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(member(9L, 10L, 1L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));

        assertThatThrownBy(() -> plantMemberService.execute(
                new ChangePlantMemberRoleCommand(null, 10L, 1L, PlantMemberRole.VIEWER)
        )).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsSelfDeactivation() {
        User manager = approvedUser(1L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(manager);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(member(9L, 10L, 1L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));

        assertThatThrownBy(() -> plantMemberService.execute(new DeactivatePlantMemberCommand(null, 10L, 1L)))
                .isInstanceOf(ForbiddenException.class);
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

    private Plant plant(Long id, ResourceStatus status) {
        OffsetDateTime now = now();
        return new Plant(id, "Plant", "서울", "설명", status, 1L, now.minusDays(5), now.minusDays(1));
    }

    private PlantMember member(Long id, Long plantId, Long userId, PlantMemberRole role, ResourceStatus status) {
        OffsetDateTime now = now();
        return new PlantMember(id, plantId, userId, role, status, now.minusDays(5), now.minusDays(1));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
    }
}
