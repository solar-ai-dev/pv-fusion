package com.pvfusion.application.dto.dashboard;

import java.util.List;

public record DashboardResponse(
        DashboardSummaryResponse summary,
        List<RecentInspectionResultResponse> recentResults,
        List<PriorityTargetResponse> priorityTargets
) {
}
