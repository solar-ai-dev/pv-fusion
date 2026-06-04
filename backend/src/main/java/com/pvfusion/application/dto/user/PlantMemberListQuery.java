package com.pvfusion.application.dto.user;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMemberRole;

public record PlantMemberListQuery(
        Long actorUserId,
        Long plantId,
        Long userId,
        PlantMemberRole memberRole,
        ResourceStatus status
) {
}
