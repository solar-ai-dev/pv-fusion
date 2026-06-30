package com.pvfusion.application.dto.plant;

public record UpdatePlantCommand(
        Long actorUserId,
        Long plantId,
        String name,
        String location,
        String description
) {
    public UpdatePlantCommand(Long plantId, String name, String location, String description) {
        this(null, plantId, name, location, description);
    }
}
