package com.pvfusion.global.error;

/**
 * Use when an authenticated user is not allowed to access the requested resource.
 * Typical source: {@code AccessChecker} returns false.
 */
public class ForbiddenException extends BusinessException {

    public ForbiddenException() {
        super(ErrorCode.FORBIDDEN);
    }

    public ForbiddenException(String detail) {
        super(ErrorCode.FORBIDDEN, detail);
    }
}
