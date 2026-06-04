package com.pvfusion.application.dto.analysis;

public record GetAnalysisJobQuery(
        Long actorUserId,
        Long jobId
) {
}
