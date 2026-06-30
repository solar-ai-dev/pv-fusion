package com.pvfusion.application.dto.equipment;

public record GetEquipmentQuery(
        Long actorUserId,
        Long equipmentId
) {
    public GetEquipmentQuery(Long equipmentId) {
        this(null, equipmentId);
    }
}
