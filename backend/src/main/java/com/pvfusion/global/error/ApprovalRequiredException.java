package com.pvfusion.global.error;

/**
 * Use when the authenticated user exists but is still in {@code PENDING} status.
 */
public class ApprovalRequiredException extends BusinessException {

    public ApprovalRequiredException() {
        super(ErrorCode.APPROVAL_REQUIRED);
    }

    public ApprovalRequiredException(String detail) {
        super(ErrorCode.APPROVAL_REQUIRED, detail);
    }
}
