package com.pvfusion.application.dto.operation;

import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import java.time.OffsetDateTime;

public record OperationLogQuery(
        Long actorUserId,
        Long requestedByUserId,
        OperationEventCategory eventCategory,
        OperationEventType eventType,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        Long imageId,
        Long imagePairId,
        Long analysisJobId,
        Long analysisResultId,
        OffsetDateTime from,
        OffsetDateTime to,
        String keyword,
        int page,
        int size,
        String sort
) {
}
