package com.pvfusion.application.dto.equipment;

public record DeactivateEquipmentCommand(
        Long actorUserId,
        Long equipmentId
) {
    public DeactivateEquipmentCommand(Long equipmentId) {
        this(null, equipmentId);
    }
}
