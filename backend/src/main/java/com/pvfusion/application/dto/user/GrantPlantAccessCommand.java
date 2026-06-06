package com.pvfusion.application.dto.user;

import com.pvfusion.domain.plant.PlantMemberRole;

public record GrantPlantAccessCommand(
        Long actorUserId,
        Long plantId,
        Long userId,
        PlantMemberRole memberRole
) {
    public GrantPlantAccessCommand(Long plantId, Long userId, PlantMemberRole memberRole) {
        this(null, plantId, userId, memberRole);
    }
}
