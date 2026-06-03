package com.pvfusion.application.dto.dashboard;

import com.pvfusion.domain.result.SeverityLevel;

public record SeverityStatItemResponse(
        SeverityLevel severityLevel,
        long count
) {
}
