package com.pvfusion.application.dto.result;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AnalysisResultSummaryResponse(
        Long resultId,
        Long jobId,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        TargetType targetType,
        Long equipmentId,
        AnalysisInputType inputType,
        AnalysisModelType modelType,
        AnalysisJobStatus jobStatus,
        AnalysisResultStatus resultStatus,
        Integer anomalyCount,
        BigDecimal severityScore,
        SeverityLevel severityLevel,
        ActionCandidate actionCandidate,
        PriorityLevel priorityLevel,
        ReviewStatus reviewStatus,
        OffsetDateTime analyzedAt
) {
}
