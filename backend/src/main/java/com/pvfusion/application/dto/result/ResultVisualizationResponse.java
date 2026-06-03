package com.pvfusion.application.dto.result;

import java.time.OffsetDateTime;

public record ResultVisualizationResponse(
        String type,
        String url,
        OffsetDateTime expiresAt
) {
}
