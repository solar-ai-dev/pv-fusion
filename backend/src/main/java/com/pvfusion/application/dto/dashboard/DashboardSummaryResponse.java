package com.pvfusion.application.dto.dashboard;

public record DashboardSummaryResponse(
        long totalPlantCount,
        long totalZoneCount,
        long totalInspectionCount,
        long totalImageCount,
        long totalAnalysisJobCount,
        long anomalyZoneCount,
        long highPriorityCount,
        long pendingReviewCount
) {
}
