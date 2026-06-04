package com.pvfusion.global.error;

/**
 * Use when the current request has no authenticated user.
 * Typical source: {@code CurrentUserPort#getCurrentUserId()} returns empty.
 */
public class UnauthorizedException extends BusinessException {

    public UnauthorizedException() {
        super(ErrorCode.UNAUTHORIZED);
    }

    public UnauthorizedException(String detail) {
        super(ErrorCode.UNAUTHORIZED, detail);
    }
}
