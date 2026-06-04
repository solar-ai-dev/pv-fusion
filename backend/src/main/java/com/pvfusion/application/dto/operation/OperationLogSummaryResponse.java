package com.pvfusion.application.dto.operation;

import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import java.time.OffsetDateTime;

public record OperationLogSummaryResponse(
        Long operationLogId,
        Long actorUserId,
        String actorEmail,
        String actorRole,
        OperationEventCategory eventCategory,
        OperationEventType eventType,
        String targetType,
        Long targetId,
        String action,
        String message,
        String traceId,
        OffsetDateTime createdAt
) {
}
