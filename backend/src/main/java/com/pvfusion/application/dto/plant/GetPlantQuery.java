package com.pvfusion.application.dto.plant;

public record GetPlantQuery(
        Long actorUserId,
        Long plantId
) {
}
