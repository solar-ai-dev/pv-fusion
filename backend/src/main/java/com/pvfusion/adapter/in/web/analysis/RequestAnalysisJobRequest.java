package com.pvfusion.adapter.in.web.analysis;

import jakarta.validation.constraints.NotNull;

public record RequestAnalysisJobRequest(
        @NotNull Long imageId,
        String traceId
) {
}
