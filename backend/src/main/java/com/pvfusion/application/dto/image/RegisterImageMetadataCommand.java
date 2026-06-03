package com.pvfusion.application.dto.image;

import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import java.time.OffsetDateTime;

public record RegisterImageMetadataCommand(
        Long actorUserId,
        Long inspectionId,
        Long equipmentId,
        TargetType targetType,
        ImageType imageType,
        String originalFilename,
        String mimeType,
        Long fileSize,
        OffsetDateTime capturedAt,
        ImageStorageResult storageResult
) {
}
