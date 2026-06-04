package com.pvfusion.application.port.out.auth;

import java.util.Optional;

public interface CurrentUserPort {

    /**
     * Returns the authenticated user id when authentication has been resolved.
     * Services should treat an empty result as {@code UNAUTHORIZED}.
     */
    Optional<Long> getCurrentUserId();

    /**
     * Returns whether the current request has an authenticated principal.
     * The concrete Session/JWT resolution strategy is decided by the auth adapter later.
     */
    boolean isAuthenticated();
}
