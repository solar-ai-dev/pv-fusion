package com.pvfusion.application.dto.zone;

public record ZoneListQuery(
        Long actorUserId,
        Long plantId
) {
    public ZoneListQuery(Long plantId) {
        this(null, plantId);
    }
}
