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
}
