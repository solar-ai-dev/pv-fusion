package com.pvfusion.application.dto.operation;

import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import java.time.OffsetDateTime;

public record OperationLogResponse(
        Long operationLogId,
        Long actorUserId,
        String actorEmail,
        String actorRole,
        OperationEventCategory eventCategory,
        OperationEventType eventType,
        String targetTable,
        Long targetId,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        Long imageId,
        Long imagePairId,
        Long analysisJobId,
        Long analysisResultId,
        String message,
        String ipAddress,
        String userAgent,
        String detail,
        OffsetDateTime createdAt
) {
}
