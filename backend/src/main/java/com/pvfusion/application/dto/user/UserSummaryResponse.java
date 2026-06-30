package com.pvfusion.application.dto.user;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import java.time.OffsetDateTime;

public record UserSummaryResponse(
        Long userId,
        String email,
        String name,
        UserRole role,
        AccountStatus accountStatus,
        OffsetDateTime lastLoginAt
) {
}
