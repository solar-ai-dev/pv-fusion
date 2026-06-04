package com.pvfusion.application.dto.dashboard;

import java.util.List;

public record ActionStatsResponse(
        List<ActionStatItemResponse> items
) {
}
