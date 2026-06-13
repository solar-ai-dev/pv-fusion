package com.pvfusion.application.service.zone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.zone.CreateZoneCommand;
import com.pvfusion.application.dto.zone.DeactivateZoneCommand;
import com.pvfusion.application.dto.zone.GetZoneQuery;
import com.pvfusion.application.dto.zone.UpdateZoneCommand;
import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.application.dto.zone.ZoneSummaryResponse;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
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
class ZoneServiceTest {

    @Mock
    private CurrentUserPort currentUserPort;
    @Mock
    private UserRepositoryPort userRepositoryPort;
    @Mock
    private PlantRepositoryPort plantRepositoryPort;
    @Mock
    private PlantMemberRepositoryPort plantMemberRepositoryPort;
    @Mock
    private ZoneRepositoryPort zoneRepositoryPort;
    @Mock
    private RecordOperationLogUseCase recordOperationLogUseCase;

    private ZoneService zoneService;

    @BeforeEach
    void setUp() {
        zoneService = new ZoneService(
                currentUserPort,
                userRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                zoneRepositoryPort,
                recordOperationLogUseCase
        );
    }

    @Test
    void createsZoneForAdmin() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);
        Zone savedZone = zone(100L, 10L, "Zone-A", ResourceStatus.ACTIVE, 1L);

        stubCurrentUser(admin);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(zoneRepositoryPort.findByPlantId(10L)).thenReturn(List.of());
        when(zoneRepositoryPort.save(any(Zone.class))).thenReturn(savedZone);

        var response = zoneService.execute(new CreateZoneCommand(null, 10L, "Zone-A", "North", "desc"));

        assertThat(response.zoneId()).isEqualTo(100L);
        assertThat(response.createdByUserId()).isEqualTo(1L);
        assertThat(response.arrayCount()).isZero();
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void createsZoneForManagerMember() {
        User user = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(zoneRepositoryPort.findByPlantId(10L)).thenReturn(List.of());
        when(zoneRepositoryPort.save(any(Zone.class))).thenAnswer(invocation -> {
            Zone zone = invocation.getArgument(0);
            return new Zone(101L, zone.getPlantId(), zone.getName(), zone.getLocation(), zone.getDescription(),
                    zone.getStatus(), zone.getCreatedByUserId(), zone.getCreatedAt(), zone.getUpdatedAt());
        });

        var response = zoneService.execute(new CreateZoneCommand(null, 10L, "Zone-B", "South", "desc"));

        assertThat(response.zoneId()).isEqualTo(101L);
        assertThat(response.plantId()).isEqualTo(10L);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void rejectsZoneCreationForViewerMember() {
        User user = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));

        assertThatThrownBy(() -> zoneService.execute(new CreateZoneCommand(null, 10L, "Zone-A", null, null)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsZoneQueryWithoutPlantAccess() {
        User user = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> zoneService.execute(new ZoneListQuery(null, 10L)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void queriesZonesForActivePlantMember() {
        User user = approvedUser(2L, UserRole.USER);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);
        List<ZoneSummaryResponse> zones = List.of(
                new ZoneSummaryResponse(1L, 10L, "Zone-A", 0L, 0L, null, 0L, null, null)
        );

        stubCurrentUser(user);
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));
        when(zoneRepositoryPort.findAll(any(ZoneListQuery.class))).thenReturn(zones);

        var result = zoneService.execute(new ZoneListQuery(null, 10L));

        ArgumentCaptor<ZoneListQuery> captor = ArgumentCaptor.forClass(ZoneListQuery.class);
        verify(zoneRepositoryPort).findAll(captor.capture());
        assertThat(captor.getValue().actorUserId()).isEqualTo(2L);
        assertThat(result).hasSize(1);
    }

    @Test
    void getsZoneDetailForAccessibleUser() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(100L, 10L, "Zone-A", ResourceStatus.INACTIVE, 1L);

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(100L)).thenReturn(Optional.of(zone));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));

        var response = zoneService.execute(new GetZoneQuery(null, 100L));

        assertThat(response.zoneId()).isEqualTo(100L);
        assertThat(response.status()).isEqualTo(ResourceStatus.INACTIVE);
    }

    @Test
    void updatesZoneForOwnerMember() {
        User user = approvedUser(2L, UserRole.USER);
        Zone existingZone = zone(100L, 10L, "Zone-A", ResourceStatus.ACTIVE, 1L);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(100L)).thenReturn(Optional.of(existingZone));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));
        when(zoneRepositoryPort.findByPlantId(10L)).thenReturn(List.of(existingZone));
        when(zoneRepositoryPort.save(any(Zone.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = zoneService.execute(new UpdateZoneCommand(null, 100L, "Zone-B", "West", "updated"));

        assertThat(response.name()).isEqualTo("Zone-B");
        assertThat(response.location()).isEqualTo("West");
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    void rejectsUpdateForInactiveZone() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Zone zone = zone(100L, 10L, "Zone-A", ResourceStatus.INACTIVE, 1L);

        stubCurrentUser(admin);
        when(zoneRepositoryPort.findById(100L)).thenReturn(Optional.of(zone));

        assertThatThrownBy(() -> zoneService.execute(new UpdateZoneCommand(null, 100L, "Zone-B", null, null)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void deactivatesZoneForManager() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(100L, 10L, "Zone-A", ResourceStatus.ACTIVE, 1L);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(100L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(zoneRepositoryPort.save(any(Zone.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = zoneService.execute(new DeactivateZoneCommand(null, 100L));

        assertThat(response.status()).isEqualTo(ResourceStatus.INACTIVE);
        verify(recordOperationLogUseCase).execute(any());
    }

    @Test
    @DisplayName("BE-UNIT-ZONE-004 deactivation preserves zone history fields")
    void deactivateZonePreservesHistoryAndChangesOnlyStatus() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(100L, 10L, "Zone-A", ResourceStatus.ACTIVE, 1L);
        Plant plant = plant(10L, ResourceStatus.ACTIVE);
        OffsetDateTime originalCreatedAt = zone.getCreatedAt();
        Long originalCreatedBy = zone.getCreatedByUserId();

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(100L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(member(30L, 10L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(zoneRepositoryPort.save(any(Zone.class))).thenAnswer(invocation -> invocation.getArgument(0));

        zoneService.execute(new DeactivateZoneCommand(null, 100L));

        ArgumentCaptor<Zone> captor = ArgumentCaptor.forClass(Zone.class);
        verify(zoneRepositoryPort).save(captor.capture());
        Zone savedZone = captor.getValue();
        assertThat(savedZone.getStatus()).isEqualTo(ResourceStatus.INACTIVE);
        assertThat(savedZone.getName()).isEqualTo("Zone-A");
        assertThat(savedZone.getCreatedByUserId()).isEqualTo(originalCreatedBy);
        assertThat(savedZone.getCreatedAt()).isEqualTo(originalCreatedAt);
    }

    @Test
    void rejectsDeactivationForAlreadyInactiveZone() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Zone zone = zone(100L, 10L, "Zone-A", ResourceStatus.INACTIVE, 1L);

        stubCurrentUser(admin);
        when(zoneRepositoryPort.findById(100L)).thenReturn(Optional.of(zone));

        assertThatThrownBy(() -> zoneService.execute(new DeactivateZoneCommand(null, 100L)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void rejectsPendingUser() {
        User pendingUser = user(1L, UserRole.USER, AccountStatus.PENDING);

        stubCurrentUser(pendingUser);

        assertThatThrownBy(() -> zoneService.execute(new ZoneListQuery(null, 10L)))
                .isInstanceOf(ApprovalRequiredException.class);
    }

    @Test
    void rejectsInactiveUser() {
        User inactiveUser = user(1L, UserRole.USER, AccountStatus.INACTIVE);

        stubCurrentUser(inactiveUser);

        assertThatThrownBy(() -> zoneService.execute(new ZoneListQuery(null, 10L)))
                .isInstanceOf(UserDeactivatedException.class);
    }

    @Test
    void rejectsUnauthenticatedUser() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> zoneService.execute(new ZoneListQuery(null, 10L)))
                .isInstanceOf(UnauthorizedException.class);
    }

    private void stubCurrentUser(User user) {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(user.getId()));
        when(userRepositoryPort.findById(user.getId())).thenReturn(Optional.of(user));
    }

    private User approvedUser(Long id, UserRole role) {
        return user(id, role, AccountStatus.APPROVED);
    }

    private User user(Long id, UserRole role, AccountStatus status) {
        OffsetDateTime now = now();
        return new User(
                id,
                "user" + id + "@example.com",
                "User " + id,
                "GOOGLE",
                "google-" + id,
                role,
                status,
                now.minusDays(1),
                now.minusDays(10),
                now.minusDays(1)
        );
    }

    private Plant plant(Long id, ResourceStatus status) {
        OffsetDateTime now = now();
        return new Plant(id, "Plant", "Seoul", "desc", status, 1L, now.minusDays(5), now.minusDays(1));
    }

    private Zone zone(Long id, Long plantId, String name, ResourceStatus status, Long createdByUserId) {
        OffsetDateTime now = now();
        return new Zone(id, plantId, name, "loc", "desc", status, createdByUserId, now.minusDays(5), now.minusDays(1));
    }

    private PlantMember member(Long id, Long plantId, Long userId, PlantMemberRole role, ResourceStatus status) {
        OffsetDateTime now = now();
        return new PlantMember(id, plantId, userId, role, status, now.minusDays(5), now.minusDays(1));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
    }
}
