package com.pvfusion.adapter.out.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.security.AuthenticatedUserPrincipal;
import java.util.Collections;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class SecurityContextCurrentUserAdapterTest {

    private final SecurityContextCurrentUserAdapter adapter = new SecurityContextCurrentUserAdapter();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsUserIdFromCustomPrincipal() {
        AuthenticatedUserPrincipal principal = new TestPrincipal(15L);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        Optional<Long> userId = adapter.getCurrentUserId();

        assertThat(userId).contains(15L);
    }

    @Test
    void returnsEmptyWhenAuthenticationIsMissing() {
        assertThat(adapter.getCurrentUserId()).isEmpty();
    }

    private record TestPrincipal(Long userId) implements AuthenticatedUserPrincipal {

        @Override
        public Long getUserId() {
            return userId;
        }

        @Override
        public String getEmail() {
            return "user@example.com";
        }

        @Override
        public String getDisplayName() {
            return "테스트";
        }

        @Override
        public UserRole getRole() {
            return UserRole.USER;
        }

        @Override
        public AccountStatus getAccountStatus() {
            return AccountStatus.APPROVED;
        }
    }
}
