package com.pvfusion.global.error;

public class DuplicateResourceException extends BusinessException {

    public DuplicateResourceException() {
        super(ErrorCode.DUPLICATE_RESOURCE);
    }

    public DuplicateResourceException(String detail) {
        super(ErrorCode.DUPLICATE_RESOURCE, detail);
    }
}
