package com.pvfusion.application.dto.analysis;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.RequestedModelType;

public record RequestAnalysisCommand(
        Long actorUserId,
        Long imageId,
        Long imagePairId,
        AnalysisInputType inputType,
        RequestedModelType requestedModelType,
        String traceId
) {
}
