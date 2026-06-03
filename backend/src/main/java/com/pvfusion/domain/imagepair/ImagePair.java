package com.pvfusion.domain.imagepair;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class ImagePair {

    private final Long id;
    private final Long inspectionId;
    private final Long equipmentId;
    private final TargetType targetType;
    private final Long rgbImageId;
    private final Long thermalImageId;
    private final ResourceStatus status;
    private final Long createdByUserId;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public ImagePair(
            Long id,
            Long inspectionId,
            Long equipmentId,
            TargetType targetType,
            Long rgbImageId,
            Long thermalImageId,
            ResourceStatus status,
            Long createdByUserId,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.inspectionId = inspectionId;
        this.equipmentId = equipmentId;
        this.targetType = targetType;
        this.rgbImageId = rgbImageId;
        this.thermalImageId = thermalImageId;
        this.status = status;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
