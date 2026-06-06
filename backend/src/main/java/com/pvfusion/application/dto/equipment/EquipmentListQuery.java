package com.pvfusion.application.dto.equipment;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.EquipmentType;

public record EquipmentListQuery(
        Long actorUserId,
        Long zoneId,
        EquipmentType equipmentType,
        ResourceStatus status
) {
    public EquipmentListQuery(Long zoneId, EquipmentType equipmentType, ResourceStatus status) {
        this(null, zoneId, equipmentType, status);
    }
}
