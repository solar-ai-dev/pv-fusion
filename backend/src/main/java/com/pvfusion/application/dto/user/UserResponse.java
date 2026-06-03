package com.pvfusion.application.dto.user;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import java.time.OffsetDateTime;
import java.util.List;

public record UserResponse(
        Long userId,
        String email,
        String name,
        String provider,
        String providerUserId,
        UserRole role,
        AccountStatus accountStatus,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<PlantMemberResponse> plantMembers
) {
}
