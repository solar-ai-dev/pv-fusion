package com.pvfusion.application.dto.equipment;

public record GetEquipmentQuery(
        Long actorUserId,
        Long equipmentId
) {
}
