package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record ActionStatsQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        LocalDate from,
        LocalDate to
) {
    public ActionStatsQuery(Long plantId, Long zoneId, LocalDate from, LocalDate to) {
        this(null, plantId, zoneId, from, to);
    }
}
