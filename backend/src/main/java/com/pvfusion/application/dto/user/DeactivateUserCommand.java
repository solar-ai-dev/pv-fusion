package com.pvfusion.application.dto.user;

public record DeactivateUserCommand(
        Long actorUserId,
        Long userId
) {
    public DeactivateUserCommand(Long userId) {
        this(null, userId);
    }
}
