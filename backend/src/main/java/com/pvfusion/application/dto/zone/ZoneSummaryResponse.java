package com.pvfusion.application.dto.zone;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import java.time.OffsetDateTime;

public record ZoneSummaryResponse(
        Long zoneId,
        Long plantId,
        String name,
        Long arrayCount,
        Long panelCount,
        OffsetDateTime latestInspectionAt,
        Long anomalyCandidateCount,
        ActionCandidate topActionCandidate,
        PriorityLevel priorityLevel
) {
}
