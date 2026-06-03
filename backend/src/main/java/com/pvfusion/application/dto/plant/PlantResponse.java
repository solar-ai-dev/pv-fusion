package com.pvfusion.application.dto.plant;

import com.pvfusion.domain.common.ResourceStatus;
import java.time.OffsetDateTime;

public record PlantResponse(
        Long plantId,
        String name,
        String location,
        String description,
        ResourceStatus status,
        Long createdByUserId,
        Long zoneCount,
        OffsetDateTime latestInspectionAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
