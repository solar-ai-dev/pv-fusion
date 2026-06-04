package com.pvfusion.adapter.in.web.inspection;

import com.pvfusion.domain.inspection.CaptureMethod;
import java.time.OffsetDateTime;

public record UpdateInspectionRequest(
        String name,
        OffsetDateTime capturedAt,
        CaptureMethod captureMethod,
        String inspectorName,
        String memo
) {
}
