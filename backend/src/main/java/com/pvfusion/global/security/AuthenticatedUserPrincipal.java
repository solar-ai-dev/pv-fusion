package com.pvfusion.global.security;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;

public interface AuthenticatedUserPrincipal {

    Long getUserId();

    String getEmail();

    String getDisplayName();

    UserRole getRole();

    AccountStatus getAccountStatus();
}
