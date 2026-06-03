package com.pvfusion.global.error;

import java.time.OffsetDateTime;

public record ErrorResponse(
        boolean success,
        ErrorBody error
) {

    public static ErrorResponse of(
            ErrorCode errorCode,
            String detail,
            String path,
            String traceId
    ) {
        return new ErrorResponse(
                false,
                new ErrorBody(
                        errorCode.getHttpStatus().value(),
                        errorCode.getCode(),
                        errorCode.getDefaultMessage(),
                        detail,
                        path,
                        OffsetDateTime.now(),
                        traceId
                )
        );
    }

    public record ErrorBody(
            int status,
            String code,
            String message,
            String detail,
            String path,
            OffsetDateTime timestamp,
            String traceId
    ) {
    }
}
