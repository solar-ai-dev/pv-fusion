package com.pvfusion.application.dto.tracking;

import java.util.List;

public record TrackingResponse(
        List<TrackingSummaryResponse> items
) {
}
