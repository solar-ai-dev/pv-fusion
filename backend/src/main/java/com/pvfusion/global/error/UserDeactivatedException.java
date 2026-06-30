package com.pvfusion.global.error;

/**
 * Use when the authenticated user account is inactive.
 */
public class UserDeactivatedException extends BusinessException {

    public UserDeactivatedException() {
        super(ErrorCode.USER_DEACTIVATED);
    }

    public UserDeactivatedException(String detail) {
        super(ErrorCode.USER_DEACTIVATED, detail);
    }
}
