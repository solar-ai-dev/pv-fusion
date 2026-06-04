package com.pvfusion.application.dto.dashboard;

import java.util.List;

public record SeverityStatsResponse(
        List<SeverityStatItemResponse> items
) {
}
