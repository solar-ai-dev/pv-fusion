package com.pvfusion.application.dto.plant;

public record CreatePlantCommand(
        Long actorUserId,
        String name,
        String location,
        String description
) {
    public CreatePlantCommand(String name, String location, String description) {
        this(null, name, location, description);
    }
}
