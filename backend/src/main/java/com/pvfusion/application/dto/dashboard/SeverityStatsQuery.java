package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record SeverityStatsQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        LocalDate from,
        LocalDate to
) {
}
