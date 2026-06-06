package com.pvfusion.adapter.in.web.admin;

import com.pvfusion.application.dto.user.ApproveUserCommand;
import com.pvfusion.application.dto.user.ChangeUserRoleCommand;
import com.pvfusion.application.dto.user.DeactivateUserCommand;
import com.pvfusion.application.dto.user.GetUserQuery;
import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.application.port.in.user.ApproveUserUseCase;
import com.pvfusion.application.port.in.user.ChangeUserRoleUseCase;
import com.pvfusion.application.port.in.user.DeactivateUserUseCase;
import com.pvfusion.application.port.in.user.GetUserUseCase;
import com.pvfusion.application.port.in.user.QueryUserUseCase;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.response.ApiResponse;
import com.pvfusion.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final QueryUserUseCase queryUserUseCase;
    private final GetUserUseCase getUserUseCase;
    private final ApproveUserUseCase approveUserUseCase;
    private final ChangeUserRoleUseCase changeUserRoleUseCase;
    private final DeactivateUserUseCase deactivateUserUseCase;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<PageResponse<UserSummaryResponse>>> getPendingUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<UserSummaryResponse> response = queryUserUseCase.execute(
                new UserListQuery(null, null, AccountStatus.PENDING, page, size)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserSummaryResponse>>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) AccountStatus accountStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<UserSummaryResponse> response = queryUserUseCase.execute(
                new UserListQuery(keyword, role, accountStatus, page, size)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(
            @PathVariable Long userId
    ) {
        UserResponse response = getUserUseCase.execute(new GetUserQuery(userId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{userId}/approve")
    public ResponseEntity<ApiResponse<UserResponse>> approveUser(
            @PathVariable Long userId
    ) {
        UserResponse response = approveUserUseCase.execute(new ApproveUserCommand(userId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<UserResponse>> changeUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody ChangeUserRoleRequest request
    ) {
        UserResponse response = changeUserRoleUseCase.execute(
                new ChangeUserRoleCommand(userId, request.role())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{userId}/deactivate")
    public ResponseEntity<ApiResponse<UserResponse>> deactivateUser(
            @PathVariable Long userId
    ) {
        UserResponse response = deactivateUserUseCase.execute(new DeactivateUserCommand(userId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
