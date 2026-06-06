package com.pvfusion.application.dto.zone;

public record CreateZoneCommand(
        Long actorUserId,
        Long plantId,
        String name,
        String location,
        String description
) {
    public CreateZoneCommand(Long plantId, String name, String location, String description) {
        this(null, plantId, name, location, description);
    }
}
