package com.pvfusion.application.dto.inspection;

import com.pvfusion.domain.inspection.CaptureMethod;
import java.time.OffsetDateTime;

public record CreateInspectionCommand(
        Long actorUserId,
        Long zoneId,
        String name,
        OffsetDateTime capturedAt,
        CaptureMethod captureMethod,
        String inspectorName,
        String memo
) {
}
