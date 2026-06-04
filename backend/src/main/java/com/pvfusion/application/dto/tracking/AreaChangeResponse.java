package com.pvfusion.application.dto.tracking;

import java.math.BigDecimal;

public record AreaChangeResponse(
        BigDecimal currentAreaRatio,
        BigDecimal previousAreaRatio,
        BigDecimal areaRatioDiff
) {
}
