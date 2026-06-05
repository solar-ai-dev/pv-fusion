package com.pvfusion.adapter.in.web.analysis;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.RequestedModelType;
import jakarta.validation.constraints.NotNull;

public record RequestAnalysisJobRequest(
        Long imageId,
        Long imagePairId,
        @NotNull AnalysisInputType inputType,
        @NotNull RequestedModelType requestedModelType,
        String traceId
) {
}
