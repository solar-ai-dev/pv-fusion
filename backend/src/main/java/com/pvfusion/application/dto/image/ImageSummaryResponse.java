package com.pvfusion.application.dto.image;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.UploadStatus;
import java.time.OffsetDateTime;

public record ImageSummaryResponse(
        Long imageId,
        Long inspectionId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        ImageType imageType,
        String originalFilename,
        String fileUrl,
        UploadStatus uploadStatus,
        ResourceStatus status,
        OffsetDateTime capturedAt
) {
}
