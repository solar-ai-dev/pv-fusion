package com.pvfusion.application.dto.plant;

public record UpdatePlantCommand(
        Long actorUserId,
        Long plantId,
        String name,
        String location,
        String description
) {
}
