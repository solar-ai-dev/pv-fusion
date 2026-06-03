package com.pvfusion.application.dto.inspection;

import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.InspectionStatus;
import java.time.OffsetDateTime;

public record InspectionSummaryResponse(
        Long inspectionId,
        Long zoneId,
        Long plantId,
        String name,
        OffsetDateTime capturedAt,
        CaptureMethod captureMethod,
        InspectionStatus inspectionStatus,
        OffsetDateTime createdAt
) {
}
