package com.pvfusion.application.dto.inspection;

import com.pvfusion.domain.inspection.InspectionStatus;
import java.time.LocalDate;

public record InspectionListQuery(
        Long actorUserId,
        Long plantId,
        Long zoneId,
        InspectionStatus inspectionStatus,
        LocalDate from,
        LocalDate to,
        int page,
        int size
) {
    public InspectionListQuery(
            Long plantId,
            Long zoneId,
            InspectionStatus inspectionStatus,
            LocalDate from,
            LocalDate to,
            int page,
            int size
    ) {
        this(null, plantId, zoneId, inspectionStatus, from, to, page, size);
    }
}
