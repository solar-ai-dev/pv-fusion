package com.pvfusion.application.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.user.ApproveUserCommand;
import com.pvfusion.application.dto.user.ChangeUserRoleCommand;
import com.pvfusion.application.dto.user.DeactivateUserCommand;
import com.pvfusion.application.dto.user.GetUserQuery;
import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private CurrentUserPort currentUserPort;

    @Mock
    private UserRepositoryPort userRepositoryPort;

    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        adminUserService = new AdminUserService(currentUserPort, userRepositoryPort);
    }

    @Test
    void queriesPendingUsersForAdmin() {
        User admin = adminUser(1L);
        PageResponse<UserSummaryResponse> page = PageResponse.of(
                List.of(new UserSummaryResponse(2L, "pending@example.com", "Pending", UserRole.USER, AccountStatus.PENDING, now())),
                0,
                20,
                1,
                1,
                false
        );

        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepositoryPort.findAll(any())).thenReturn(page);

        PageResponse<UserSummaryResponse> response = adminUserService.execute(
                new UserListQuery(null, null, null, AccountStatus.PENDING, 0, 20)
        );

        assertThat(response.totalElements()).isEqualTo(1);
        assertThat(response.content()).hasSize(1);
        verify(userRepositoryPort).findAll(any());
    }

    @Test
    void rejectsUserListForNonAdmin() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(2L));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(approvedUser(2L)));

        assertThatThrownBy(() -> adminUserService.execute(new UserListQuery(null, null, null, null, 0, 20)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void throwsUnauthorizedWhenAuthenticationIsMissing() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminUserService.execute(new GetUserQuery(null, 1L)))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void throwsApprovalRequiredForPendingAdminRequest() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(3L));
        when(userRepositoryPort.findById(3L)).thenReturn(Optional.of(pendingAdmin(3L)));

        assertThatThrownBy(() -> adminUserService.execute(new GetUserQuery(null, 1L)))
                .isInstanceOf(ApprovalRequiredException.class);
    }

    @Test
    void throwsUserDeactivatedForInactiveAdminRequest() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(4L));
        when(userRepositoryPort.findById(4L)).thenReturn(Optional.of(inactiveAdmin(4L)));

        assertThatThrownBy(() -> adminUserService.execute(new GetUserQuery(null, 1L)))
                .isInstanceOf(UserDeactivatedException.class);
    }

    @Test
    void approvesPendingUser() {
        User admin = adminUser(1L);
        User pendingUser = baseUser(2L, UserRole.USER, AccountStatus.PENDING);

        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(pendingUser));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.execute(new ApproveUserCommand(null, 2L));

        assertThat(response.userId()).isEqualTo(2L);
        assertThat(response.accountStatus()).isEqualTo(AccountStatus.APPROVED);
    }

    @Test
    void rejectsApproveForApprovedUser() {
        stubAdmin();
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(baseUser(2L, UserRole.USER, AccountStatus.APPROVED)));

        assertThatThrownBy(() -> adminUserService.execute(new ApproveUserCommand(null, 2L)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void rejectsApproveForInactiveUser() {
        stubAdmin();
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(baseUser(2L, UserRole.USER, AccountStatus.INACTIVE)));

        assertThatThrownBy(() -> adminUserService.execute(new ApproveUserCommand(null, 2L)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void changesUserRoleToAdmin() {
        stubAdmin();
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(baseUser(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.execute(new ChangeUserRoleCommand(null, 2L, UserRole.ADMIN));

        assertThat(response.role()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void rejectsSelfDemotion() {
        stubAdmin();

        assertThatThrownBy(() -> adminUserService.execute(new ChangeUserRoleCommand(null, 1L, UserRole.USER)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deactivatesUser() {
        stubAdmin();
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(baseUser(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.execute(new DeactivateUserCommand(null, 2L));

        assertThat(response.accountStatus()).isEqualTo(AccountStatus.INACTIVE);
    }

    @Test
    void rejectsSelfDeactivation() {
        stubAdmin();

        assertThatThrownBy(() -> adminUserService.execute(new DeactivateUserCommand(null, 1L)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void throwsNotFoundWhenTargetUserDoesNotExist() {
        stubAdmin();
        when(userRepositoryPort.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminUserService.execute(new GetUserQuery(null, 999L)))
                .isInstanceOf(NotFoundException.class);
    }

    private void stubAdmin() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(adminUser(1L)));
    }

    private User adminUser(Long id) {
        return baseUser(id, UserRole.ADMIN, AccountStatus.APPROVED);
    }

    private User approvedUser(Long id) {
        return baseUser(id, UserRole.USER, AccountStatus.APPROVED);
    }

    private User pendingAdmin(Long id) {
        return baseUser(id, UserRole.ADMIN, AccountStatus.PENDING);
    }

    private User inactiveAdmin(Long id) {
        return baseUser(id, UserRole.ADMIN, AccountStatus.INACTIVE);
    }

    private User baseUser(Long id, UserRole role, AccountStatus accountStatus) {
        OffsetDateTime now = now();
        return new User(
                id,
                "user" + id + "@example.com",
                "User " + id,
                "GOOGLE",
                "google-" + id,
                role,
                accountStatus,
                now.minusDays(1),
                now.minusDays(10),
                now.minusDays(1)
        );
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
    }
}
