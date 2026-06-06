package com.pvfusion.application.dto.dashboard;

public record DashboardSummaryResponse(
        long totalPlantCount,
        long totalZoneCount,
        long totalInspectionCount,
        long inProgressInspectionCount,
        long completedInspectionCount,
        long totalImageCount,
        long totalImagePairCount,
        long totalAnalysisJobCount,
        long queuedJobCount,
        long runningJobCount,
        long succeededJobCount,
        long failedJobCount,
        long totalAnalysisResultCount,
        long normalResultCount,
        long anomalyResultCount,
        long lowConfidenceResultCount,
        long anomalyZoneCount,
        long highPriorityCount,
        long pendingReviewCount,
        long worsenedCount,
        long repeatedAnomalyCount
) {
}
