package com.pvfusion.application.dto.analysis;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;

public record AnalysisJobListQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        AnalysisJobStatus jobStatus,
        AnalysisInputType inputType,
        AnalysisModelType modelType,
        int page,
        int size
) {
    public AnalysisJobListQuery(
            Long plantId,
            Long zoneId,
            Long inspectionId,
            AnalysisJobStatus jobStatus,
            AnalysisInputType inputType,
            AnalysisModelType modelType,
            int page,
            int size
    ) {
        this(null, plantId, zoneId, inspectionId, jobStatus, inputType, modelType, page, size);
    }
}
