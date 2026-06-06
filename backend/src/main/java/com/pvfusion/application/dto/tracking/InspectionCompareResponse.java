package com.pvfusion.application.dto.tracking;

public record InspectionCompareResponse(
        Long currentResultId,
        Long previousResultId,
        TrackingSummaryResponse currentResult,
        TrackingSummaryResponse previousResult,
        AreaChangeResponse areaChange,
        SeverityChangeResponse severityChange,
        DefectChangeResponse defectChange,
        boolean repeatedAnomaly,
        boolean worsened,
        String priorityReason
) {
}
