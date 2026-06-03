package com.pvfusion.application.dto.tracking;

import java.math.BigDecimal;

public record SeverityChangeResponse(
        BigDecimal currentSeverityScore,
        BigDecimal previousSeverityScore,
        BigDecimal severityScoreDiff,
        boolean worsened
) {
}
