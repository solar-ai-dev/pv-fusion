package com.pvfusion.application.dto.result;

public record GetResultVisualizationQuery(
        Long actorUserId,
        Long resultId,
        String type,
        String mode
) {
    public GetResultVisualizationQuery(Long resultId, String type, String mode) {
        this(null, resultId, type, mode);
    }
}
