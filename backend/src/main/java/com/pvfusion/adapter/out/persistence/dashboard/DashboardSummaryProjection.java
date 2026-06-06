package com.pvfusion.adapter.out.persistence.dashboard;

public interface DashboardSummaryProjection {

    long getTotalPlantCount();

    long getTotalZoneCount();

    long getTotalInspectionCount();

    long getInProgressInspectionCount();

    long getCompletedInspectionCount();

    long getTotalImageCount();

    long getTotalImagePairCount();

    long getTotalAnalysisJobCount();

    long getQueuedJobCount();

    long getRunningJobCount();

    long getSucceededJobCount();

    long getFailedJobCount();

    long getTotalAnalysisResultCount();

    long getNormalResultCount();

    long getAnomalyResultCount();

    long getLowConfidenceResultCount();

    long getAnomalyZoneCount();

    long getHighPriorityCount();

    long getPendingReviewCount();
}
