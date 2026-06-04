package com.pvfusion.application.dto.image;

import java.time.OffsetDateTime;

public record ImagePreviewResponse(
        Long imageId,
        String url,
        OffsetDateTime expiresAt
) {
}
