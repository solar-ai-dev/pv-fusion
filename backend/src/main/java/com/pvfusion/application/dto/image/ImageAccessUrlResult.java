package com.pvfusion.application.dto.image;

import java.time.OffsetDateTime;

public record ImageAccessUrlResult(
        String accessUrl,
        OffsetDateTime expiresAt
) {
}
