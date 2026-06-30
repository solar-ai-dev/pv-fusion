package com.pvfusion.application.dto.imagepair;

import com.pvfusion.domain.common.TargetType;

public record ImagePairCandidateQuery(
        Long actorUserId,
        Long inspectionId,
        TargetType targetType,
        Long equipmentId
) {
    public ImagePairCandidateQuery(Long inspectionId, TargetType targetType, Long equipmentId) {
        this(null, inspectionId, targetType, equipmentId);
    }
}
