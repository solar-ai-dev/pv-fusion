package com.pvfusion.application.service.equipment;

import com.pvfusion.application.dto.equipment.CreateEquipmentCommand;
import com.pvfusion.application.dto.equipment.DeactivateEquipmentCommand;
import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.application.dto.equipment.EquipmentResponse;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import com.pvfusion.application.dto.equipment.GetEquipmentQuery;
import com.pvfusion.application.dto.equipment.UpdateEquipmentCommand;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.in.equipment.CreateEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.DeactivateEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.GetEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.QueryEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.UpdateEquipmentUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.equipment.EquipmentRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.equipment.EquipmentType;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EquipmentService implements CreateEquipmentUseCase, QueryEquipmentUseCase,
        GetEquipmentUseCase, UpdateEquipmentUseCase, DeactivateEquipmentUseCase {

    private static final int MAX_PARENT_DEPTH = 32;

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;
    private final ZoneRepositoryPort zoneRepositoryPort;
    private final PlantRepositoryPort plantRepositoryPort;
    private final PlantMemberRepositoryPort plantMemberRepositoryPort;
    private final EquipmentRepositoryPort equipmentRepositoryPort;
    private final RecordOperationLogUseCase recordOperationLogUseCase;

    @Override
    public EquipmentResponse execute(CreateEquipmentCommand command) {
        User currentUser = requireApprovedUser();
        Zone zone = getZone(command.zoneId());
        Plant plant = getPlant(zone.getPlantId());

        if (zone.isInactive()) {
            throw new DuplicateResourceException("Inactive zone cannot accept new equipment.");
        }
        if (plant.isInactive()) {
            throw new DuplicateResourceException("Inactive plant cannot accept new equipment.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        validateCreateCommand(command);

        List<Equipment> zoneEquipments = equipmentRepositoryPort.findByZoneId(zone.getId());
        Map<Long, Equipment> equipmentMap = toEquipmentMap(zoneEquipments);
        validateHierarchyForCreate(zone.getId(), command.parentEquipmentId(), command.equipmentType(), equipmentMap);
        ensureUniqueEquipment(zoneEquipments, command.name().trim(), normalizeText(command.positionCode()), null);

        OffsetDateTime now = OffsetDateTime.now();
        Equipment saved = equipmentRepositoryPort.save(new Equipment(
                null,
                zone.getId(),
                command.parentEquipmentId(),
                command.equipmentType(),
                command.name().trim(),
                normalizeText(command.positionCode()),
                ResourceStatus.ACTIVE,
                currentUser.getId(),
                now,
                now
        ));

        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                currentUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.EQUIPMENT_CREATED,
                "equipments",
                saved.getId(),
                plant.getId(),
                saved.getZoneId(),
                null,
                null,
                null,
                null,
                null,
                "Equipment created.",
                null,
                null,
                "equipmentType=" + saved.getEquipmentType() + ",name=" + saved.getName()
        ));
        return toResponse(saved);
    }

    @Override
    public List<EquipmentTreeResponse> execute(EquipmentListQuery query) {
        User currentUser = requireApprovedUser();
        Zone zone = getZone(query.zoneId());

        requirePlantAccess(currentUser, zone.getPlantId());
        ResourceStatus effectiveStatus = query.status() == null ? ResourceStatus.ACTIVE : query.status();
        return equipmentRepositoryPort.findAll(new EquipmentListQuery(
                currentUser.getId(),
                zone.getId(),
                query.equipmentType(),
                effectiveStatus
        ));
    }

    @Override
    public EquipmentResponse execute(GetEquipmentQuery query) {
        User currentUser = requireApprovedUser();
        Equipment equipment = getEquipment(query.equipmentId());
        Zone zone = getZone(equipment.getZoneId());

        requirePlantAccess(currentUser, zone.getPlantId());
        return toResponse(equipment);
    }

    @Override
    public EquipmentResponse execute(UpdateEquipmentCommand command) {
        User currentUser = requireApprovedUser();
        Equipment equipment = getEquipment(command.equipmentId());
        Zone zone = getZone(equipment.getZoneId());
        Plant plant = getPlant(zone.getPlantId());

        if (equipment.isInactive()) {
            throw new DuplicateResourceException("Inactive equipment cannot be updated.");
        }
        if (zone.isInactive()) {
            throw new DuplicateResourceException("Equipment in inactive zone cannot be updated.");
        }
        if (plant.isInactive()) {
            throw new DuplicateResourceException("Equipment in inactive plant cannot be updated.");
        }

        requirePlantManagePermission(currentUser, plant.getId());
        validateUpdateCommand(command);

        List<Equipment> zoneEquipments = equipmentRepositoryPort.findByZoneId(zone.getId());
        Map<Long, Equipment> equipmentMap = toEquipmentMap(zoneEquipments);
        validateHierarchyForUpdate(equipment, command.parentEquipmentId(), command.equipmentType(), equipmentMap);
        ensureChildrenCompatible(equipment.getId(), command.equipmentType(), equipmentMap);
        ensureUniqueEquipment(
                zoneEquipments,
                command.name().trim(),
                normalizeText(command.positionCode()),
                equipment.getId()
        );

        Equipment savedEquipment = equipmentRepositoryPort.save(equipment.update(
                command.parentEquipmentId(),
                command.equipmentType(),
                command.name().trim(),
                normalizeText(command.positionCode())
        ));
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                currentUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.EQUIPMENT_UPDATED,
                "equipments",
                savedEquipment.getId(),
                plant.getId(),
                savedEquipment.getZoneId(),
                null,
                null,
                null,
                null,
                null,
                "Equipment updated.",
                null,
                null,
                "equipmentType=" + savedEquipment.getEquipmentType() + ",name=" + savedEquipment.getName()
        ));
        return toResponse(savedEquipment);
    }

    @Override
    public EquipmentResponse execute(DeactivateEquipmentCommand command) {
        User currentUser = requireApprovedUser();
        Equipment equipment = getEquipment(command.equipmentId());
        Zone zone = getZone(equipment.getZoneId());
        Plant plant = getPlant(zone.getPlantId());

        requirePlantManagePermission(currentUser, plant.getId());

        if (equipment.isInactive()) {
            throw new DuplicateResourceException("Equipment is already inactive.");
        }
        if (hasActiveDirectChild(equipment.getId(), equipmentRepositoryPort.findByZoneId(equipment.getZoneId()))) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Active child equipment must be deactivated first.");
        }

        Equipment savedEquipment = equipmentRepositoryPort.save(equipment.deactivate());
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                currentUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.EQUIPMENT_DEACTIVATED,
                "equipments",
                savedEquipment.getId(),
                plant.getId(),
                savedEquipment.getZoneId(),
                null,
                null,
                null,
                null,
                null,
                "Equipment deactivated.",
                null,
                null,
                "status=ACTIVE->INACTIVE"
        ));
        return toResponse(savedEquipment);
    }

    private User requireApprovedUser() {
        Long currentUserId = currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);

        User currentUser = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("Current authenticated user was not found."));

        if (currentUser.isInactive()) {
            throw new UserDeactivatedException();
        }
        if (currentUser.isPending()) {
            throw new ApprovalRequiredException();
        }

        return currentUser;
    }

    private Zone getZone(Long zoneId) {
        return zoneRepositoryPort.findById(zoneId)
                .orElseThrow(() -> new NotFoundException("Zone was not found."));
    }

    private Plant getPlant(Long plantId) {
        return plantRepositoryPort.findById(plantId)
                .orElseThrow(() -> new NotFoundException("Plant was not found."));
    }

    private Equipment getEquipment(Long equipmentId) {
        return equipmentRepositoryPort.findById(equipmentId)
                .orElseThrow(() -> new NotFoundException("Equipment was not found."));
    }

    private void requirePlantAccess(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = getActivePlantMember(plantId, currentUser.getId(), "Plant access is denied.");
        if (!plantMember.isActive()) {
            throw new ForbiddenException("Plant access is denied.");
        }
    }

    private void requirePlantManagePermission(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = getActivePlantMember(plantId, currentUser.getId(), "Plant manage permission is denied.");
        if (!plantMember.hasManageRole()) {
            throw new ForbiddenException("Plant manage permission is denied.");
        }
    }

    private PlantMember getActivePlantMember(Long plantId, Long userId, String deniedMessage) {
        PlantMember plantMember = plantMemberRepositoryPort.findByPlantIdAndUserId(plantId, userId)
                .orElseThrow(() -> new ForbiddenException(deniedMessage));

        if (plantMember.isInactive()) {
            throw new ForbiddenException("Inactive plant membership cannot be used.");
        }

        return plantMember;
    }

    private void validateCreateCommand(CreateEquipmentCommand command) {
        validateEquipmentType(command.equipmentType());
        validateName(command.name());
    }

    private void validateUpdateCommand(UpdateEquipmentCommand command) {
        validateEquipmentType(command.equipmentType());
        validateName(command.name());
    }

    private void validateEquipmentType(EquipmentType equipmentType) {
        if (equipmentType == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "equipmentType is required.");
        }
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "name is required.");
        }
    }

    private void validateHierarchyForCreate(
            Long zoneId,
            Long parentEquipmentId,
            EquipmentType equipmentType,
            Map<Long, Equipment> equipmentMap
    ) {
        if (parentEquipmentId == null) {
            if (equipmentType != EquipmentType.ARRAY) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Only ARRAY can be created without parent.");
            }
            return;
        }

        Equipment parent = equipmentMap.get(parentEquipmentId);
        if (parent == null) {
            throw new NotFoundException("Parent equipment was not found.");
        }
        validateParentStateAndZone(zoneId, parent);
        validateParentChildType(parent.getEquipmentType(), equipmentType);
    }

    private void validateHierarchyForUpdate(
            Equipment equipment,
            Long nextParentEquipmentId,
            EquipmentType nextType,
            Map<Long, Equipment> equipmentMap
    ) {
        if (nextParentEquipmentId != null && nextParentEquipmentId.equals(equipment.getId())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Equipment cannot be its own parent.");
        }

        if (nextParentEquipmentId == null) {
            if (nextType != EquipmentType.ARRAY) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Only ARRAY can exist without parent.");
            }
            return;
        }

        Equipment parent = equipmentMap.get(nextParentEquipmentId);
        if (parent == null) {
            throw new NotFoundException("Parent equipment was not found.");
        }
        validateParentStateAndZone(equipment.getZoneId(), parent);
        validateParentChildType(parent.getEquipmentType(), nextType);
        ensureNoCycle(equipment.getId(), nextParentEquipmentId, equipmentMap);
    }

    private void validateParentStateAndZone(Long zoneId, Equipment parent) {
        if (!parent.isSameZone(zoneId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Parent equipment must belong to the same zone.");
        }
        if (parent.isInactive()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Inactive parent equipment cannot be used.");
        }
    }

    private void validateParentChildType(EquipmentType parentType, EquipmentType childType) {
        boolean valid = switch (parentType) {
            case ARRAY -> childType == EquipmentType.PANEL;
            case PANEL -> childType == EquipmentType.MODULE;
            case MODULE -> false;
        };

        if (!valid) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Invalid equipment hierarchy.");
        }
    }

    private void ensureNoCycle(Long equipmentId, Long nextParentEquipmentId, Map<Long, Equipment> equipmentMap) {
        Long cursor = nextParentEquipmentId;
        int depth = 0;

        while (cursor != null) {
            if (cursor.equals(equipmentId)) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Equipment hierarchy cycle is not allowed.");
            }
            if (++depth > MAX_PARENT_DEPTH) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Equipment hierarchy depth exceeded safety limit.");
            }

            Equipment parent = equipmentMap.get(cursor);
            if (parent == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Parent hierarchy is inconsistent.");
            }
            cursor = parent.getParentEquipmentId();
        }
    }

    private void ensureChildrenCompatible(Long equipmentId, EquipmentType nextType, Map<Long, Equipment> equipmentMap) {
        for (Equipment child : equipmentMap.values()) {
            if (child.getParentEquipmentId() != null
                    && child.getParentEquipmentId().equals(equipmentId)
                    && child.isActive()) {
                validateParentChildType(nextType, child.getEquipmentType());
            }
        }
    }

    private void ensureUniqueEquipment(
            List<Equipment> zoneEquipments,
            String name,
            String positionCode,
            Long currentEquipmentId
    ) {
        boolean duplicatedName = zoneEquipments.stream()
                .filter(Equipment::isActive)
                .filter(equipment -> currentEquipmentId == null || !equipment.getId().equals(currentEquipmentId))
                .anyMatch(equipment -> equipment.getName() != null && equipment.getName().equalsIgnoreCase(name));

        if (duplicatedName) {
            throw new DuplicateResourceException("Equipment name already exists in the zone.");
        }

        if (positionCode == null) {
            return;
        }

        boolean duplicatedPositionCode = zoneEquipments.stream()
                .filter(Equipment::isActive)
                .filter(equipment -> currentEquipmentId == null || !equipment.getId().equals(currentEquipmentId))
                .anyMatch(equipment -> equipment.getPositionCode() != null
                        && equipment.getPositionCode().equalsIgnoreCase(positionCode));

        if (duplicatedPositionCode) {
            throw new DuplicateResourceException("Equipment positionCode already exists in the zone.");
        }
    }

    private boolean hasActiveDirectChild(Long equipmentId, List<Equipment> zoneEquipments) {
        return zoneEquipments.stream()
                .anyMatch(child -> child.isActive()
                        && child.getParentEquipmentId() != null
                        && child.getParentEquipmentId().equals(equipmentId));
    }

    private Map<Long, Equipment> toEquipmentMap(List<Equipment> equipments) {
        Map<Long, Equipment> equipmentMap = new HashMap<>();
        for (Equipment equipment : equipments) {
            equipmentMap.put(equipment.getId(), equipment);
        }
        return equipmentMap;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private EquipmentResponse toResponse(Equipment equipment) {
        return new EquipmentResponse(
                equipment.getId(),
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
    }
}
