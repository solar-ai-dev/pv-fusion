package com.pvfusion.application.dto.user;

public record ApproveUserCommand(
        Long actorUserId,
        Long userId
) {
    public ApproveUserCommand(Long userId) {
        this(null, userId);
    }
}
