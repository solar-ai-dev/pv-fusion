package com.pvfusion.application.dto.user;

import com.pvfusion.domain.user.UserRole;

public record ChangeUserRoleCommand(
        Long actorUserId,
        Long userId,
        UserRole role
) {
}
