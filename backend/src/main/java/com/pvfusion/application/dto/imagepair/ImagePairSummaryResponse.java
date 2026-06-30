package com.pvfusion.application.dto.imagepair;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import java.time.OffsetDateTime;

public record ImagePairSummaryResponse(
        Long imagePairId,
        Long inspectionId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        Long rgbImageId,
        Long thermalImageId,
        ResourceStatus status,
        OffsetDateTime createdAt
) {
}
