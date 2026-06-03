package com.pvfusion.application.dto.dashboard;

import java.time.LocalDate;

public record DashboardTrendPointResponse(
        LocalDate trendDate,
        long inspectionCount,
        long anomalyCount
) {
}
