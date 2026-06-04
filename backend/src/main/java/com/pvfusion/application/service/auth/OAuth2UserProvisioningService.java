package com.pvfusion.application.service.auth;

import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OAuth2UserProvisioningService {

    private final UserRepositoryPort userRepositoryPort;

    public User provisionOrUpdate(OAuth2UserProfile profile) {
        OffsetDateTime now = OffsetDateTime.now();

        Optional<User> existingUser = userRepositoryPort.findByProviderAndProviderUserId(
                profile.provider(),
                profile.providerUserId()
        );

        if (existingUser.isEmpty()) {
            existingUser = userRepositoryPort.findByEmail(profile.email());
        }

        User user = existingUser
                .map(existing -> updateExistingUser(existing, profile, now))
                .orElseGet(() -> createPendingUser(profile, now));

        return userRepositoryPort.save(user);
    }

    private User updateExistingUser(User existingUser, OAuth2UserProfile profile, OffsetDateTime now) {
        return new User(
                existingUser.getId(),
                profile.email(),
                profile.name(),
                profile.provider(),
                profile.providerUserId(),
                existingUser.getRole(),
                existingUser.getAccountStatus(),
                now,
                existingUser.getCreatedAt(),
                now
        );
    }

    private User createPendingUser(OAuth2UserProfile profile, OffsetDateTime now) {
        return new User(
                null,
                profile.email(),
                profile.name(),
                profile.provider(),
                profile.providerUserId(),
                UserRole.USER,
                AccountStatus.PENDING,
                now,
                now,
                now
        );
    }
}
