package com.pvfusion.domain.user;

import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class User {

    private final Long id;
    private final String email;
    private final String name;
    private final String provider;
    private final String providerUserId;
    private final UserRole role;
    private final AccountStatus accountStatus;
    private final OffsetDateTime lastLoginAt;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public User(
            Long id,
            String email,
            String name,
            String provider,
            String providerUserId,
            UserRole role,
            AccountStatus accountStatus,
            OffsetDateTime lastLoginAt,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.role = role;
        this.accountStatus = accountStatus;
        this.lastLoginAt = lastLoginAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
