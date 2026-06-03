package com.pvfusion.application.dto.dashboard;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.time.OffsetDateTime;

public record RecentInspectionResultResponse(
        Long resultId,
        Long inspectionId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        String plantName,
        String zoneName,
        String inspectionName,
        ActionCandidate actionCandidate,
        SeverityLevel severityLevel,
        PriorityLevel priorityLevel,
        OffsetDateTime analyzedAt
) {
}
