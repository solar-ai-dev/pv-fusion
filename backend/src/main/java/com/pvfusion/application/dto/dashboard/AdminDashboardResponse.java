package com.pvfusion.application.dto.dashboard;

public record AdminDashboardResponse(
        long totalUserCount,
        long totalImageCount,
        long totalAnalysisJobCount,
        long totalResultCount,
        DashboardSummaryResponse summary
) {
}
