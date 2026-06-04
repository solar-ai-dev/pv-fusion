package com.pvfusion.application.dto.analysis;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import java.time.OffsetDateTime;

public record AnalysisJobSummaryResponse(
        Long jobId,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        Long imageId,
        Long imagePairId,
        AnalysisInputType inputType,
        AnalysisModelType modelType,
        AnalysisJobStatus jobStatus,
        OffsetDateTime requestedAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt
) {
}
