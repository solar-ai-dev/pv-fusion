package com.pvfusion.application.dto.image;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.UploadStatus;
import java.time.OffsetDateTime;

public record ImageResponse(
        Long imageId,
        Long inspectionId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        ImageType imageType,
        String originalFilename,
        String mimeType,
        Long fileSize,
        String bucketName,
        String objectKey,
        String fileUrl,
        OffsetDateTime capturedAt,
        UploadStatus uploadStatus,
        ResourceStatus status,
        Long uploadedByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
