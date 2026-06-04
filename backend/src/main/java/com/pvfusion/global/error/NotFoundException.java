package com.pvfusion.global.error;

public class NotFoundException extends BusinessException {

    public NotFoundException() {
        super(ErrorCode.NOT_FOUND);
    }

    public NotFoundException(String detail) {
        super(ErrorCode.NOT_FOUND, detail);
    }
}
