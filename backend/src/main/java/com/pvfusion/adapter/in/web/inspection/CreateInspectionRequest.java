package com.pvfusion.adapter.in.web.inspection;

import com.pvfusion.domain.inspection.CaptureMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record CreateInspectionRequest(
        @NotNull Long zoneId,
        @NotBlank String name,
        OffsetDateTime capturedAt,
        @NotNull CaptureMethod captureMethod,
        String inspectorName,
        String memo
) {
}
