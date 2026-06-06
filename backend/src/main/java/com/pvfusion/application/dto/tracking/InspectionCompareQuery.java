package com.pvfusion.application.dto.tracking;

public record InspectionCompareQuery(
        Long actorUserId,
        Long currentResultId,
        Long previousResultId
) {
    public InspectionCompareQuery(Long currentResultId, Long previousResultId) {
        this(null, currentResultId, previousResultId);
    }
}
