package com.pvfusion.application.dto.user;

public record DeactivatePlantMemberCommand(
        Long actorUserId,
        Long plantMemberId
) {
}
