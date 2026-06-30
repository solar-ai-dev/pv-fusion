package com.pvfusion.application.dto.plant;

import com.pvfusion.domain.common.ResourceStatus;
import java.time.OffsetDateTime;

public record PlantSummaryResponse(
        Long plantId,
        String name,
        String location,
        ResourceStatus status,
        Long zoneCount,
        OffsetDateTime latestInspectionAt
) {
}
