package com.pvfusion.application.dto.plant;

public record CreatePlantCommand(
        Long actorUserId,
        String name,
        String location,
        String description
) {
}
