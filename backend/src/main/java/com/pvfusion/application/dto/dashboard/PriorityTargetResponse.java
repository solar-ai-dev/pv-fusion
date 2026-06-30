package com.pvfusion.application.dto.dashboard;

import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;

public record PriorityTargetResponse(
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        Long resultId,
        ActionCandidate actionCandidate,
        SeverityLevel severityLevel,
        PriorityLevel priorityLevel,
        String priorityReason
) {
}
