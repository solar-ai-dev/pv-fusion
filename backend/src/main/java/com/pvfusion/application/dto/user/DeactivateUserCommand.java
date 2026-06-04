package com.pvfusion.application.dto.user;

public record DeactivateUserCommand(
        Long actorUserId,
        Long userId
) {
}
