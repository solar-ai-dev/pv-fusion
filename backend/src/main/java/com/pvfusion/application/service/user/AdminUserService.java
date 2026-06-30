package com.pvfusion.application.service.user;

import com.pvfusion.application.dto.user.ApproveUserCommand;
import com.pvfusion.application.dto.user.ChangeUserRoleCommand;
import com.pvfusion.application.dto.user.DeactivateUserCommand;
import com.pvfusion.application.dto.user.GetUserQuery;
import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.in.user.ApproveUserUseCase;
import com.pvfusion.application.port.in.user.ChangeUserRoleUseCase;
import com.pvfusion.application.port.in.user.DeactivateUserUseCase;
import com.pvfusion.application.port.in.user.GetUserUseCase;
import com.pvfusion.application.port.in.user.QueryUserUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.DuplicateResourceException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import com.pvfusion.global.response.PageResponse;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminUserService implements QueryUserUseCase, GetUserUseCase,
        ApproveUserUseCase, ChangeUserRoleUseCase, DeactivateUserUseCase {

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;
    private final RecordOperationLogUseCase recordOperationLogUseCase;

    @Override
    public PageResponse<UserSummaryResponse> execute(UserListQuery query) {
        requireAdmin();
        return userRepositoryPort.findAll(query);
    }

    @Override
    public UserResponse execute(GetUserQuery query) {
        requireAdmin();
        return toResponse(getTargetUser(query.userId()));
    }

    @Override
    public UserResponse execute(ApproveUserCommand command) {
        User adminUser = requireAdmin();
        User targetUser = getTargetUser(command.userId());

        if (targetUser.isApproved()) {
            throw new DuplicateResourceException("이미 승인된 사용자입니다.");
        }
        if (targetUser.isInactive()) {
            throw new DuplicateResourceException("비활성화된 사용자는 승인할 수 없습니다.");
        }

        User savedUser = userRepositoryPort.save(targetUser.approve());
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                adminUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.USER_APPROVED,
                "users",
                savedUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "User approved.",
                null,
                null,
                "accountStatus=PENDING->APPROVED"
        ));
        return toResponse(savedUser);
    }

    @Override
    public UserResponse execute(ChangeUserRoleCommand command) {
        User adminUser = requireAdmin();
        User targetUser = getTargetUser(command.userId());
        validateRole(command.role());

        if (targetUser.isInactive()) {
            throw new DuplicateResourceException("비활성화된 사용자의 권한은 변경할 수 없습니다.");
        }
        if (targetUser.getRole() == command.role()) {
            throw new DuplicateResourceException("동일한 권한으로 변경할 수 없습니다.");
        }
        if (isSelf(adminUser, targetUser) && command.role() != null && !command.role().equals(targetUser.getRole())) {
            if (targetUser.isAdmin() && command.role() == UserRole.USER) {
                throw new ForbiddenException("자기 자신의 관리자 권한은 강등할 수 없습니다.");
            }
        }

        User savedUser = userRepositoryPort.save(targetUser.changeRole(command.role()));
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                adminUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.USER_ROLE_CHANGED,
                "users",
                savedUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "User role changed.",
                null,
                null,
                "role=" + targetUser.getRole() + "->" + savedUser.getRole()
        ));
        return toResponse(savedUser);
    }

    @Override
    public UserResponse execute(DeactivateUserCommand command) {
        User adminUser = requireAdmin();
        User targetUser = getTargetUser(command.userId());

        if (targetUser.isInactive()) {
            throw new DuplicateResourceException("이미 비활성화된 사용자입니다.");
        }
        if (isSelf(adminUser, targetUser)) {
            throw new ForbiddenException("자기 자신은 비활성화할 수 없습니다.");
        }

        User savedUser = userRepositoryPort.save(targetUser.deactivate());
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                adminUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.USER_DEACTIVATED,
                "users",
                savedUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "User deactivated.",
                null,
                null,
                "accountStatus=APPROVED->INACTIVE"
        ));
        return toResponse(savedUser);
    }

    private User requireAdmin() {
        Long currentUserId = currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);

        User currentUser = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("현재 인증된 사용자 정보를 찾을 수 없습니다."));

        if (currentUser.isInactive()) {
            throw new UserDeactivatedException();
        }
        if (currentUser.isPending()) {
            throw new ApprovalRequiredException();
        }
        if (!currentUser.isAdmin()) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }

        return currentUser;
    }

    private User getTargetUser(Long userId) {
        return userRepositoryPort.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    private boolean isSelf(User adminUser, User targetUser) {
        return adminUser.getId() != null && adminUser.getId().equals(targetUser.getId());
    }

    private void validateRole(UserRole role) {
        if (role == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "role is required.");
        }
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getProvider(),
                user.getProviderUserId(),
                user.getRole(),
                user.getAccountStatus(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                Collections.emptyList()
        );
    }
}
