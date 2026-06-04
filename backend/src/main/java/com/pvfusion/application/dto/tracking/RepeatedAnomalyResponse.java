package com.pvfusion.application.dto.tracking;

import com.pvfusion.domain.common.TargetType;
import java.time.OffsetDateTime;

public record RepeatedAnomalyResponse(
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        Long currentInspectionId,
        Long previousInspectionId,
        Long currentResultId,
        Long previousResultId,
        Integer repeatedAnomalyCount,
        boolean repeated,
        OffsetDateTime analyzedAt
) {
}
