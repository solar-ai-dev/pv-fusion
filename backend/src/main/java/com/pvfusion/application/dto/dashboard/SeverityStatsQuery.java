package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record SeverityStatsQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        LocalDate from,
        LocalDate to
) {
    public SeverityStatsQuery(Long plantId, Long zoneId, LocalDate from, LocalDate to) {
        this(null, plantId, zoneId, from, to);
    }
}
