package com.pvfusion.application.dto.zone;

public record DeactivateZoneCommand(
        Long actorUserId,
        Long zoneId
) {
    public DeactivateZoneCommand(Long zoneId) {
        this(null, zoneId);
    }
}
