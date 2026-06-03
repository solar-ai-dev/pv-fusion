package com.pvfusion.application.dto.zone;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import java.time.OffsetDateTime;

public record ZoneResponse(
        Long zoneId,
        Long plantId,
        String name,
        String location,
        String description,
        ResourceStatus status,
        Long createdByUserId,
        Long arrayCount,
        Long panelCount,
        OffsetDateTime latestInspectionAt,
        Long anomalyCandidateCount,
        ActionCandidate topActionCandidate,
        PriorityLevel priorityLevel,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
