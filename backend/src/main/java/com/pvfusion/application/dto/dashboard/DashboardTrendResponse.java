package com.pvfusion.application.dto.dashboard;

import java.util.List;

public record DashboardTrendResponse(
        String period,
        List<DashboardTrendPointResponse> points
) {
}
