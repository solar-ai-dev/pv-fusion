package com.pvfusion.application.dto.tracking;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.time.LocalDate;

public record TrackingQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        LocalDate from,
        LocalDate to,
        AnalysisInputType inputType,
        AnalysisModelType modelType,
        ActionCandidate actionCandidate,
        PriorityLevel priorityLevel,
        SeverityLevel severityLevel
) {
    public TrackingQuery(
            Long plantId,
            Long zoneId,
            Long equipmentId,
            TargetType targetType,
            LocalDate from,
            LocalDate to,
            AnalysisInputType inputType,
            AnalysisModelType modelType,
            ActionCandidate actionCandidate,
            PriorityLevel priorityLevel,
            SeverityLevel severityLevel
    ) {
        this(null, plantId, zoneId, equipmentId, targetType, from, to, inputType, modelType, actionCandidate, priorityLevel, severityLevel);
    }
}
