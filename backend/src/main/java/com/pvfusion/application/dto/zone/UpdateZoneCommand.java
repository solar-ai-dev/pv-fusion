package com.pvfusion.application.dto.zone;

public record UpdateZoneCommand(
        Long actorUserId,
        Long zoneId,
        String name,
        String location,
        String description
) {
    public UpdateZoneCommand(Long zoneId, String name, String location, String description) {
        this(null, zoneId, name, location, description);
    }
}
