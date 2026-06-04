package com.pvfusion.application.dto.tracking;

import com.pvfusion.domain.common.TargetType;
import java.time.LocalDate;

public record RepeatedAnomalyQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        TargetType targetType,
        LocalDate from,
        LocalDate to
) {
}
