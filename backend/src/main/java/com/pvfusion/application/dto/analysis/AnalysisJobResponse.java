package com.pvfusion.application.dto.analysis;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import java.time.OffsetDateTime;

public record AnalysisJobResponse(
        Long jobId,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        Long imageId,
        Long imagePairId,
        AnalysisInputType inputType,
        RequestedModelType requestedModelType,
        AnalysisModelType modelType,
        AnalysisJobStatus jobStatus,
        Long requestedByUserId,
        OffsetDateTime requestedAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        String failureCode,
        String failureMessage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String traceId
) {
}
