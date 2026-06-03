package com.pvfusion.application.dto.analysis;

public record RetryAnalysisJobCommand(
        Long actorUserId,
        Long jobId,
        String traceId
) {
}
