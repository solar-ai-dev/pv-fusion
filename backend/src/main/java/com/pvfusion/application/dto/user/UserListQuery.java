package com.pvfusion.application.dto.user;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;

public record UserListQuery(
        Long actorUserId,
        String keyword,
        UserRole role,
        AccountStatus accountStatus,
        int page,
        int size
) {
}
