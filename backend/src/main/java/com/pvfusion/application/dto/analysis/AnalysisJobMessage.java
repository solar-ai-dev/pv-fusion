package com.pvfusion.application.dto.analysis;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.RequestedModelType;
import java.time.OffsetDateTime;

public record AnalysisJobMessage(
        Long jobId,
        AnalysisInputType inputType,
        Long imageId,
        Long imagePairId,
        RequestedModelType requestedModelType,
        Long requestedByUserId,
        String traceId,
        OffsetDateTime createdAt
) {
}
