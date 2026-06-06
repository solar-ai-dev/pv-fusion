package com.pvfusion.application.service.equipment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.equipment.CreateEquipmentCommand;
import com.pvfusion.application.dto.equipment.DeactivateEquipmentCommand;
import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import com.pvfusion.application.dto.equipment.GetEquipmentQuery;
import com.pvfusion.application.dto.equipment.UpdateEquipmentCommand;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.equipment.EquipmentRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.equipment.EquipmentType;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EquipmentServiceTest {

    @Mock
    private CurrentUserPort currentUserPort;
    @Mock
    private UserRepositoryPort userRepositoryPort;
    @Mock
    private ZoneRepositoryPort zoneRepositoryPort;
    @Mock
    private PlantRepositoryPort plantRepositoryPort;
    @Mock
    private PlantMemberRepositoryPort plantMemberRepositoryPort;
    @Mock
    private EquipmentRepositoryPort equipmentRepositoryPort;

    private EquipmentService equipmentService;

    @BeforeEach
    void setUp() {
        equipmentService = new EquipmentService(
                currentUserPort,
                userRepositoryPort,
                zoneRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                equipmentRepositoryPort
        );
    }

    @Test
    void createsTopLevelArrayForAdmin() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);
        Equipment saved = equipment(100L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of());
        when(equipmentRepositoryPort.save(any(Equipment.class))).thenReturn(saved);

        var response = equipmentService.execute(new CreateEquipmentCommand(null, 10L, null, EquipmentType.ARRAY, "Array-01", "A01"));

        assertThat(response.equipmentId()).isEqualTo(100L);
        assertThat(response.equipmentType()).isEqualTo(EquipmentType.ARRAY);
    }

    @Test
    void createsChildPanelForManager() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);
        Equipment parent = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L))
                .thenReturn(Optional.of(member(30L, 20L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(parent));
        when(equipmentRepositoryPort.save(any(Equipment.class))).thenAnswer(invocation -> {
            Equipment equipment = invocation.getArgument(0);
            return new Equipment(
                    101L,
                    equipment.getZoneId(),
                    equipment.getParentEquipmentId(),
                    equipment.getEquipmentType(),
                    equipment.getName(),
                    equipment.getPositionCode(),
                    equipment.getStatus(),
                    equipment.getCreatedByUserId(),
                    equipment.getCreatedAt(),
                    equipment.getUpdatedAt()
            );
        });

        var response = equipmentService.execute(new CreateEquipmentCommand(null, 10L, 11L, EquipmentType.PANEL, "Panel-01", "A01-P01"));

        assertThat(response.parentEquipmentId()).isEqualTo(11L);
        assertThat(response.equipmentType()).isEqualTo(EquipmentType.PANEL);
    }

    @Test
    void rejectsCreateForViewer() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L))
                .thenReturn(Optional.of(member(30L, 20L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));

        assertThatThrownBy(() -> equipmentService.execute(
                new CreateEquipmentCommand(null, 10L, null, EquipmentType.ARRAY, "Array-01", "A01")
        )).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsCreateWhenParentIsMissing() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of());

        assertThatThrownBy(() -> equipmentService.execute(
                new CreateEquipmentCommand(null, 10L, 999L, EquipmentType.PANEL, "Panel-01", "A01-P01")
        )).isInstanceOf(com.pvfusion.global.error.NotFoundException.class);
    }

    @Test
    void rejectsCreateWhenParentIsInDifferentZone() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);
        Equipment parent = equipment(11L, 99L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(parent));

        assertThatThrownBy(() -> equipmentService.execute(
                new CreateEquipmentCommand(null, 10L, 11L, EquipmentType.PANEL, "Panel-01", "A01-P01")
        )).isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsCreateWhenHierarchyTypeIsInvalid() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);
        Equipment parent = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(parent));

        assertThatThrownBy(() -> equipmentService.execute(
                new CreateEquipmentCommand(null, 10L, 11L, EquipmentType.MODULE, "Module-01", "A01-M01")
        )).isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsZoneQueryWithoutPlantAccess() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> equipmentService.execute(new EquipmentListQuery(null, 10L, null, null)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void queriesEquipmentListForActiveMember() {
        User user = approvedUser(2L, UserRole.USER);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        List<EquipmentTreeResponse> tree = List.of(
                new EquipmentTreeResponse(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE, List.of())
        );

        stubCurrentUser(user);
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L))
                .thenReturn(Optional.of(member(30L, 20L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));
        when(equipmentRepositoryPort.findAll(any(EquipmentListQuery.class))).thenReturn(tree);

        var result = equipmentService.execute(new EquipmentListQuery(null, 10L, null, null));

        ArgumentCaptor<EquipmentListQuery> captor = ArgumentCaptor.forClass(EquipmentListQuery.class);
        verify(equipmentRepositoryPort).findAll(captor.capture());
        assertThat(captor.getValue().status()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(result).hasSize(1);
    }

    @Test
    void getsEquipmentDetailForAccessibleUser() {
        User user = approvedUser(2L, UserRole.USER);
        Equipment equipment = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.INACTIVE);
        Zone zone = zone(10L, 20L, ResourceStatus.INACTIVE);

        stubCurrentUser(user);
        when(equipmentRepositoryPort.findById(11L)).thenReturn(Optional.of(equipment));
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L))
                .thenReturn(Optional.of(member(30L, 20L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE)));

        var response = equipmentService.execute(new GetEquipmentQuery(null, 11L));

        assertThat(response.status()).isEqualTo(ResourceStatus.INACTIVE);
    }

    @Test
    void updatesEquipmentForOwner() {
        User user = approvedUser(2L, UserRole.USER);
        Equipment equipment = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);
        Equipment child = equipment(12L, 10L, 11L, EquipmentType.PANEL, "Panel-01", "A01-P01", ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(equipmentRepositoryPort.findById(11L)).thenReturn(Optional.of(equipment));
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L))
                .thenReturn(Optional.of(member(30L, 20L, 2L, PlantMemberRole.OWNER, ResourceStatus.ACTIVE)));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(child, equipment));
        when(equipmentRepositoryPort.save(any(Equipment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = equipmentService.execute(new UpdateEquipmentCommand(null, 11L, null, EquipmentType.ARRAY, "Array-02", "A02"));

        assertThat(response.name()).isEqualTo("Array-02");
        assertThat(response.positionCode()).isEqualTo("A02");
    }

    @Test
    void rejectsUpdateForInactiveEquipment() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Equipment equipment = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.INACTIVE);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(equipmentRepositoryPort.findById(11L)).thenReturn(Optional.of(equipment));
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));

        assertThatThrownBy(() -> equipmentService.execute(
                new UpdateEquipmentCommand(null, 11L, null, EquipmentType.ARRAY, "Array-02", "A02")
        )).isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void rejectsCycleOnUpdate() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Equipment array = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);
        Equipment panel = equipment(12L, 10L, 11L, EquipmentType.PANEL, "Panel-01", "A01-P01", ResourceStatus.ACTIVE);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(equipmentRepositoryPort.findById(11L)).thenReturn(Optional.of(array));
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(panel, array));

        assertThatThrownBy(() -> equipmentService.execute(
                new UpdateEquipmentCommand(null, 11L, 12L, EquipmentType.ARRAY, "Array-01", "A01")
        )).isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsDeactivationWhenActiveChildExists() {
        User admin = approvedUser(1L, UserRole.ADMIN);
        Equipment array = equipment(11L, 10L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE);
        Equipment panel = equipment(12L, 10L, 11L, EquipmentType.PANEL, "Panel-01", "A01-P01", ResourceStatus.ACTIVE);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);

        stubCurrentUser(admin);
        when(equipmentRepositoryPort.findById(11L)).thenReturn(Optional.of(array));
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(panel, array));

        assertThatThrownBy(() -> equipmentService.execute(new DeactivateEquipmentCommand(null, 11L)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void deactivatesEquipmentWithoutActiveChild() {
        User user = approvedUser(2L, UserRole.USER);
        Equipment panel = equipment(12L, 10L, 11L, EquipmentType.PANEL, "Panel-01", "A01-P01", ResourceStatus.ACTIVE);
        Equipment module = equipment(13L, 10L, 12L, EquipmentType.MODULE, "Module-01", "A01-P01-M01", ResourceStatus.INACTIVE);
        Zone zone = zone(10L, 20L, ResourceStatus.ACTIVE);
        Plant plant = plant(20L, ResourceStatus.ACTIVE);

        stubCurrentUser(user);
        when(equipmentRepositoryPort.findById(12L)).thenReturn(Optional.of(panel));
        when(zoneRepositoryPort.findById(10L)).thenReturn(Optional.of(zone));
        when(plantRepositoryPort.findById(20L)).thenReturn(Optional.of(plant));
        when(plantMemberRepositoryPort.findByPlantIdAndUserId(20L, 2L))
                .thenReturn(Optional.of(member(30L, 20L, 2L, PlantMemberRole.MANAGER, ResourceStatus.ACTIVE)));
        when(equipmentRepositoryPort.findByZoneId(10L)).thenReturn(List.of(module, panel));
        when(equipmentRepositoryPort.save(any(Equipment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = equipmentService.execute(new DeactivateEquipmentCommand(null, 12L));

        assertThat(response.status()).isEqualTo(ResourceStatus.INACTIVE);
    }

    @Test
    void rejectsPendingUser() {
        User pendingUser = user(1L, UserRole.USER, AccountStatus.PENDING);

        stubCurrentUser(pendingUser);

        assertThatThrownBy(() -> equipmentService.execute(new EquipmentListQuery(null, 10L, null, null)))
                .isInstanceOf(ApprovalRequiredException.class);
    }

    @Test
    void rejectsInactiveUser() {
        User inactiveUser = user(1L, UserRole.USER, AccountStatus.INACTIVE);

        stubCurrentUser(inactiveUser);

        assertThatThrownBy(() -> equipmentService.execute(new EquipmentListQuery(null, 10L, null, null)))
                .isInstanceOf(UserDeactivatedException.class);
    }

    @Test
    void rejectsUnauthenticatedUser() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> equipmentService.execute(new EquipmentListQuery(null, 10L, null, null)))
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

    private Zone zone(Long id, Long plantId, ResourceStatus status) {
        OffsetDateTime now = now();
        return new Zone(id, plantId, "Zone-A", "North", "desc", status, 1L, now.minusDays(5), now.minusDays(1));
    }

    private Plant plant(Long id, ResourceStatus status) {
        OffsetDateTime now = now();
        return new Plant(id, "Plant-A", "Seoul", "desc", status, 1L, now.minusDays(5), now.minusDays(1));
    }

    private PlantMember member(Long id, Long plantId, Long userId, PlantMemberRole role, ResourceStatus status) {
        OffsetDateTime now = now();
        return new PlantMember(id, plantId, userId, role, status, now.minusDays(5), now.minusDays(1));
    }

    private Equipment equipment(
            Long id,
            Long zoneId,
            Long parentEquipmentId,
            EquipmentType equipmentType,
            String name,
            String positionCode,
            ResourceStatus status
    ) {
        OffsetDateTime now = now();
        return new Equipment(id, zoneId, parentEquipmentId, equipmentType, name, positionCode, status, 1L, now.minusDays(5), now.minusDays(1));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
