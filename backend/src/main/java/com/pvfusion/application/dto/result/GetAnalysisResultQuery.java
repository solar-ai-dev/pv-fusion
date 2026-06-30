package com.pvfusion.application.dto.result;

public record GetAnalysisResultQuery(
        Long actorUserId,
        Long resultId
) {
    public GetAnalysisResultQuery(Long resultId) {
        this(null, resultId);
    }
}
