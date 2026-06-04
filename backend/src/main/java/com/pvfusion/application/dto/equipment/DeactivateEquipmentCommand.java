package com.pvfusion.application.dto.equipment;

public record DeactivateEquipmentCommand(
        Long actorUserId,
        Long equipmentId
) {
}
