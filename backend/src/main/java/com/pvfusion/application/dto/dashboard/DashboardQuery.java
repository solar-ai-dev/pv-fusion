package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record DashboardQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        LocalDate from,
        LocalDate to
) {
    public DashboardQuery(Long plantId, Long zoneId, LocalDate from, LocalDate to) {
        this(null, plantId, zoneId, from, to);
    }
}
