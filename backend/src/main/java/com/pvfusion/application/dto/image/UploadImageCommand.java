package com.pvfusion.application.dto.image;

import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import java.time.OffsetDateTime;

public record UploadImageCommand(
        Long actorUserId,
        Long inspectionId,
        Long equipmentId,
        TargetType targetType,
        ImageType imageType,
        String originalFilename,
        String mimeType,
        Long fileSize,
        OffsetDateTime capturedAt,
        String memo,
        String sourceKey,
        byte[] fileContent
) {
    public UploadImageCommand(
            Long inspectionId,
            Long equipmentId,
            TargetType targetType,
            ImageType imageType,
            String originalFilename,
            String mimeType,
            long fileSize,
            OffsetDateTime capturedAt,
            String memo,
            String sourceKey,
            byte[] fileContent
    ) {
        this(
                null,
                inspectionId,
                equipmentId,
                targetType,
                imageType,
                originalFilename,
                mimeType,
                fileSize,
                capturedAt,
                memo,
                sourceKey,
                fileContent
        );
    }
}
