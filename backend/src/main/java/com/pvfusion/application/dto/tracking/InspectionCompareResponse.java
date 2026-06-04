package com.pvfusion.application.dto.tracking;

public record InspectionCompareResponse(
        Long currentResultId,
        Long previousResultId,
        TrackingSummaryResponse currentResult,
        TrackingSummaryResponse previousResult,
        AreaChangeResponse areaChange,
        SeverityChangeResponse severityChange,
        boolean repeatedAnomaly,
        boolean worsened,
        String priorityReason
) {
}
