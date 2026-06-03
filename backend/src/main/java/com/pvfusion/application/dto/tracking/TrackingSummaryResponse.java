package com.pvfusion.application.dto.tracking;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TrackingSummaryResponse(
        Long currentInspectionId,
        Long previousInspectionId,
        Long currentResultId,
        Long previousResultId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        AnalysisInputType inputType,
        AnalysisModelType modelType,
        Integer anomalyCount,
        Integer repeatedAnomalyCount,
        BigDecimal currentAreaRatio,
        BigDecimal previousAreaRatio,
        BigDecimal currentSeverityScore,
        BigDecimal previousSeverityScore,
        ActionCandidate actionCandidate,
        PriorityLevel priorityLevel,
        SeverityLevel severityLevel,
        boolean repeated,
        boolean worsened,
        OffsetDateTime analyzedAt
) {
}
