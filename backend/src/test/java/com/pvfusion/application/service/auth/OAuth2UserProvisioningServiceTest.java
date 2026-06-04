package com.pvfusion.application.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OAuth2UserProvisioningServiceTest {

    @Mock
    private UserRepositoryPort userRepositoryPort;

    private OAuth2UserProvisioningService provisioningService;

    @BeforeEach
    void setUp() {
        provisioningService = new OAuth2UserProvisioningService(userRepositoryPort);
    }

    @Test
    void createsPendingUserOnFirstLogin() {
        OAuth2UserProfile profile = new OAuth2UserProfile(
                "new@example.com",
                "새사용자",
                "GOOGLE",
                "google-123"
        );

        when(userRepositoryPort.findByProviderAndProviderUserId("GOOGLE", "google-123")).thenReturn(Optional.empty());
        when(userRepositoryPort.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepositoryPort.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = provisioningService.provisionOrUpdate(profile);

        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.PENDING);
        assertThat(user.getProvider()).isEqualTo("GOOGLE");
        assertThat(user.getProviderUserId()).isEqualTo("google-123");
    }

    @Test
    void updatesExistingUserLastLoginAt() {
        OffsetDateTime createdAt = OffsetDateTime.now().minusDays(10);
        OffsetDateTime previousLogin = OffsetDateTime.now().minusDays(1);
        User existingUser = new User(
                10L,
                "existing@example.com",
                "기존사용자",
                "GOOGLE",
                "google-456",
                UserRole.ADMIN,
                AccountStatus.APPROVED,
                previousLogin,
                createdAt,
                previousLogin
        );
        OAuth2UserProfile profile = new OAuth2UserProfile(
                "existing@example.com",
                "기존사용자",
                "GOOGLE",
                "google-456"
        );

        when(userRepositoryPort.findByProviderAndProviderUserId("GOOGLE", "google-456"))
                .thenReturn(Optional.of(existingUser));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = provisioningService.provisionOrUpdate(profile);

        assertThat(user.getId()).isEqualTo(10L);
        assertThat(user.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.APPROVED);
        assertThat(user.getLastLoginAt()).isAfter(previousLogin);
        assertThat(user.getCreatedAt()).isEqualTo(createdAt);
    }
}
