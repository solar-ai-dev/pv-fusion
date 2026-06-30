package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record DashboardTrendQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        LocalDate from,
        LocalDate to,
        String interval
) {
    public DashboardTrendQuery(Long plantId, Long zoneId, LocalDate from, LocalDate to, String interval) {
        this(null, plantId, zoneId, from, to, interval);
    }
}
