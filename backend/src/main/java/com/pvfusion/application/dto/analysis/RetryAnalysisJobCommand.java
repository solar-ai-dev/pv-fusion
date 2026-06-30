package com.pvfusion.application.dto.analysis;

public record RetryAnalysisJobCommand(
        Long actorUserId,
        Long jobId,
        String traceId
) {
    public RetryAnalysisJobCommand(Long jobId, String traceId) {
        this(null, jobId, traceId);
    }
}
