package com.pvfusion.adapter.in.web.admin;

import com.pvfusion.domain.user.UserRole;
import jakarta.validation.constraints.NotNull;

public record ChangeUserRoleRequest(
        @NotNull UserRole role
) {
}
