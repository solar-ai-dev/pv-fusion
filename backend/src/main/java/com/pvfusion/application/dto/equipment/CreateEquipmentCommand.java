package com.pvfusion.application.dto.equipment;

import com.pvfusion.domain.equipment.EquipmentType;

public record CreateEquipmentCommand(
        Long actorUserId,
        Long zoneId,
        Long parentEquipmentId,
        EquipmentType equipmentType,
        String name,
        String positionCode
) {
    public CreateEquipmentCommand(
            Long zoneId,
            Long parentEquipmentId,
            EquipmentType equipmentType,
            String name,
            String positionCode
    ) {
        this(null, zoneId, parentEquipmentId, equipmentType, name, positionCode);
    }
}
