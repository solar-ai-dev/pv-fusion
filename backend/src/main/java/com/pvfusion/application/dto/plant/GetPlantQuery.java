package com.pvfusion.application.dto.plant;

public record GetPlantQuery(
        Long actorUserId,
        Long plantId
) {
    public GetPlantQuery(Long plantId) {
        this(null, plantId);
    }
}
