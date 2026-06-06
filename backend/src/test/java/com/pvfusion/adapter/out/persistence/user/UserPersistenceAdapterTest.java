package com.pvfusion.adapter.out.persistence.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Import({UserPersistenceAdapter.class, UserPersistenceMapper.class})
class UserPersistenceAdapterTest {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;

    @Test
    void savesNewUserAndFindsItByIdAndEmail() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T09:00:00+09:00");
        User saved = userPersistenceAdapter.save(new User(
                null,
                "new-user@example.com",
                "New User",
                "GOOGLE",
                "google-user-1",
                UserRole.USER,
                AccountStatus.PENDING,
                now,
                now,
                now
        ));

        Optional<User> foundById = userPersistenceAdapter.findById(saved.getId());
        Optional<User> foundByEmail = userPersistenceAdapter.findByEmail("new-user@example.com");

        assertThat(saved.getId()).isNotNull();
        assertThat(foundById).isPresent();
        assertThat(foundByEmail).isPresent();
        assertThat(foundById.orElseThrow().getAccountStatus()).isEqualTo(AccountStatus.PENDING);
        assertThat(foundByEmail.orElseThrow().getRole()).isEqualTo(UserRole.USER);
    }

    @Test
    void findsUserByProviderAndProviderUserId() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T09:30:00+09:00");
        userPersistenceAdapter.save(new User(
                null,
                "provider-user@example.com",
                "Provider User",
                "GOOGLE",
                "google-provider-1",
                UserRole.ADMIN,
                AccountStatus.APPROVED,
                now,
                now,
                now
        ));

        Optional<User> found = userPersistenceAdapter.findByProviderAndProviderUserId("GOOGLE", "google-provider-1");

        assertThat(found).isPresent();
        assertThat(found.orElseThrow().getEmail()).isEqualTo("provider-user@example.com");
        assertThat(found.orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void updatesExistingUserLastLoginAt() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-06-01T09:00:00+09:00");
        OffsetDateTime firstLoginAt = OffsetDateTime.parse("2026-06-04T09:00:00+09:00");
        User saved = userPersistenceAdapter.save(new User(
                null,
                "existing-user@example.com",
                "Existing User",
                "GOOGLE",
                "google-existing-1",
                UserRole.USER,
                AccountStatus.APPROVED,
                firstLoginAt,
                createdAt,
                firstLoginAt
        ));
        OffsetDateTime updatedLoginAt = OffsetDateTime.parse("2026-06-05T09:00:00+09:00");

        User updated = userPersistenceAdapter.save(new User(
                saved.getId(),
                saved.getEmail(),
                saved.getName(),
                saved.getProvider(),
                saved.getProviderUserId(),
                saved.getRole(),
                saved.getAccountStatus(),
                updatedLoginAt,
                saved.getCreatedAt(),
                updatedLoginAt
        ));

        assertThat(updated.getId()).isEqualTo(saved.getId());
        assertThat(updated.getLastLoginAt()).isEqualTo(updatedLoginAt);
        assertThat(updated.getCreatedAt()).isEqualTo(saved.getCreatedAt());
    }

    @Test
    void filtersPagedUserList() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
        userPersistenceAdapter.save(new User(
                null,
                "pending-user@example.com",
                "Pending User",
                "GOOGLE",
                "google-pending-1",
                UserRole.USER,
                AccountStatus.PENDING,
                now,
                now,
                now
        ));
        userPersistenceAdapter.save(new User(
                null,
                "approved-user@example.com",
                "Approved User",
                "GOOGLE",
                "google-approved-1",
                UserRole.USER,
                AccountStatus.APPROVED,
                now,
                now,
                now
        ));

        PageResponse<?> page = userPersistenceAdapter.findAll(new UserListQuery(
                1L,
                "pending",
                UserRole.USER,
                AccountStatus.PENDING,
                0,
                10
        ));

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content()).hasSize(1);
    }

    @Test
    void findsUsersWhenKeywordIsNull() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T11:00:00+09:00");
        userPersistenceAdapter.save(new User(
                null,
                "null-keyword@example.com",
                "Null Keyword",
                "GOOGLE",
                "google-null-1",
                UserRole.USER,
                AccountStatus.APPROVED,
                now,
                now,
                now
        ));

        PageResponse<?> page = userPersistenceAdapter.findAll(new UserListQuery(
                null,
                null,
                UserRole.USER,
                AccountStatus.APPROVED,
                0,
                10
        ));

        assertThat(page.totalElements()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void findsUsersWithCaseInsensitiveKeyword() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T12:00:00+09:00");
        userPersistenceAdapter.save(new User(
                null,
                "bong@example.com",
                "Bong Admin",
                "GOOGLE",
                "google-bong-1",
                UserRole.ADMIN,
                AccountStatus.APPROVED,
                now,
                now,
                now
        ));

        PageResponse<?> page = userPersistenceAdapter.findAll(new UserListQuery(
                null,
                "  BONG ",
                UserRole.ADMIN,
                AccountStatus.APPROVED,
                0,
                10
        ));

        assertThat(page.content().toString()).contains("bong@example.com");
    }
}
