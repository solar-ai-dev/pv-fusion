package com.pvfusion.global.error;

public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final String detail;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.detail = null;
    }

    public BusinessException(ErrorCode errorCode, String detail) {
        super(detail != null && !detail.isBlank() ? detail : errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.detail = detail;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public String getDetail() {
        return detail;
    }
}
