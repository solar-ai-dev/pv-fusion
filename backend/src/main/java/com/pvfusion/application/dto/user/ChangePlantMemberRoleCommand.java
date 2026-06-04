package com.pvfusion.application.dto.user;

import com.pvfusion.domain.plant.PlantMemberRole;

public record ChangePlantMemberRoleCommand(
        Long actorUserId,
        Long plantId,
        Long userId,
        PlantMemberRole memberRole
) {
}
