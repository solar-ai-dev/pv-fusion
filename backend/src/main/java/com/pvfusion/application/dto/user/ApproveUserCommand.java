package com.pvfusion.application.dto.user;

public record ApproveUserCommand(
        Long actorUserId,
        Long userId
) {
}
