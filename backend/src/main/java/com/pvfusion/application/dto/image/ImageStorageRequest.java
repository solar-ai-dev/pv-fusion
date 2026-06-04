package com.pvfusion.application.dto.image;

import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;

public record ImageStorageRequest(
        Long inspectionId,
        Long imageId,
        ImageType imageType,
        TargetType targetType,
        String originalFilename,
        String mimeType,
        String sourceKey
) {
}
