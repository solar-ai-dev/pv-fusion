package com.pvfusion.application.dto.result;

import java.math.BigDecimal;

public record ModelInfoResponse(
        String modelName,
        String modelVersion,
        String modelFormat,
        String runtime,
        Integer inputSize,
        BigDecimal threshold
) {
}
