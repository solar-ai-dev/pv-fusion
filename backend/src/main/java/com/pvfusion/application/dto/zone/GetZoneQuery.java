package com.pvfusion.application.dto.zone;

public record GetZoneQuery(
        Long actorUserId,
        Long zoneId
) {
    public GetZoneQuery(Long zoneId) {
        this(null, zoneId);
    }
}
