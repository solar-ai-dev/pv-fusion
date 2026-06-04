package com.pvfusion.application.dto.user;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMemberRole;
import java.time.OffsetDateTime;

public record PlantMemberResponse(
        Long plantMemberId,
        Long plantId,
        Long userId,
        PlantMemberRole memberRole,
        ResourceStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
