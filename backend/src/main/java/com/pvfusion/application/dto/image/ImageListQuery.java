package com.pvfusion.application.dto.image;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;

public record ImageListQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        Long equipmentId,
        ImageType imageType,
        TargetType targetType,
        ResourceStatus status
) {
    public ImageListQuery(
            Long plantId,
            Long zoneId,
            Long inspectionId,
            Long equipmentId,
            ImageType imageType,
            TargetType targetType,
            ResourceStatus status
    ) {
        this(null, plantId, zoneId, inspectionId, equipmentId, imageType, targetType, status);
    }
}
