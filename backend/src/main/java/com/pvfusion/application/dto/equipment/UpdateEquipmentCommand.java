package com.pvfusion.application.dto.equipment;

import com.pvfusion.domain.equipment.EquipmentType;

public record UpdateEquipmentCommand(
        Long actorUserId,
        Long equipmentId,
        Long parentEquipmentId,
        EquipmentType equipmentType,
        String name,
        String positionCode
) {
}
