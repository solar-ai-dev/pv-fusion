package com.pvfusion.application.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.user.GetCurrentUserQuery;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GetCurrentUserServiceTest {

    @Mock
    private CurrentUserPort currentUserPort;

    @Mock
    private UserRepositoryPort userRepositoryPort;

    private GetCurrentUserService getCurrentUserService;

    @BeforeEach
    void setUp() {
        getCurrentUserService = new GetCurrentUserService(
                currentUserPort,
                userRepositoryPort
        );
    }

    @Test
    void returnsCurrentUserForApprovedAccount() {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User(
                1L,
                "user@example.com",
                "홍길동",
                "google",
                "google-123",
                UserRole.USER,
                AccountStatus.APPROVED,
                now,
                now.minusDays(1),
                now
        );

        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user));

        UserResponse response = getCurrentUserService.execute(new GetCurrentUserQuery(null));

        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.accountStatus()).isEqualTo(AccountStatus.APPROVED);
        assertThat(response.plantMembers()).isEmpty();
    }

    @Test
    void allowsPendingAccountForAuthMe() {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User(
                2L,
                "pending@example.com",
                "승인대기",
                "google",
                "google-456",
                UserRole.USER,
                AccountStatus.PENDING,
                now,
                now.minusDays(1),
                now
        );

        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(2L));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user));

        UserResponse response = getCurrentUserService.execute(new GetCurrentUserQuery(999L));

        assertThat(response.userId()).isEqualTo(2L);
        assertThat(response.accountStatus()).isEqualTo(AccountStatus.PENDING);
        assertThat(response.plantMembers()).isEmpty();
    }

    @Test
    void throwsUnauthorizedWhenSecurityContextIsEmpty() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> getCurrentUserService.execute(new GetCurrentUserQuery(null)))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void throwsUserDeactivatedForInactiveAccount() {
        OffsetDateTime now = OffsetDateTime.now();
        User user = new User(
                3L,
                "inactive@example.com",
                "비활성",
                "google",
                "google-789",
                UserRole.USER,
                AccountStatus.INACTIVE,
                now,
                now.minusDays(1),
                now
        );

        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(3L));
        when(userRepositoryPort.findById(3L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> getCurrentUserService.execute(new GetCurrentUserQuery(null)))
                .isInstanceOf(UserDeactivatedException.class);
    }
}
