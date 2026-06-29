package com.pvfusion.application.dto.analysis;

public record RequestAnalysisCommand(
        Long imageId,
        String traceId
) {
}
