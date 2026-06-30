package com.pvfusion.application.dto.user;

public record GetUserQuery(
        Long actorUserId,
        Long userId
) {
    public GetUserQuery(Long userId) {
        this(null, userId);
    }
}
