package com.pvfusion.application.dto.tracking;

public record InspectionCompareQuery(
        Long actorUserId,
        Long currentResultId,
        Long previousResultId
) {
}
