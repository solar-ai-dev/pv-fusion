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
}
