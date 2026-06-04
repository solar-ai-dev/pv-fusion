package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record ActionStatsQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        LocalDate from,
        LocalDate to
) {
}
