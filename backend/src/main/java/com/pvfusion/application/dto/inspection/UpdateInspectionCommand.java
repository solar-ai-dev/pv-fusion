package com.pvfusion.application.dto.inspection;

import com.pvfusion.domain.inspection.CaptureMethod;
import java.time.OffsetDateTime;

public record UpdateInspectionCommand(
        Long actorUserId,
        Long inspectionId,
        String name,
        OffsetDateTime capturedAt,
        CaptureMethod captureMethod,
        String inspectorName,
        String memo
) {
    public UpdateInspectionCommand(
            Long inspectionId,
            String name,
            OffsetDateTime capturedAt,
            CaptureMethod captureMethod,
            String inspectorName,
            String memo
    ) {
        this(null, inspectionId, name, capturedAt, captureMethod, inspectorName, memo);
    }
}
