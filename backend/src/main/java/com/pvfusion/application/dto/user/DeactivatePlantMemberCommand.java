package com.pvfusion.application.dto.user;

public record DeactivatePlantMemberCommand(
        Long actorUserId,
        Long plantId,
        Long userId
) {
    public DeactivatePlantMemberCommand(Long plantId, Long userId) {
        this(null, plantId, userId);
    }
}
