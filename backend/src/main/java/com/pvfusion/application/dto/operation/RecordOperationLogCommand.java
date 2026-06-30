package com.pvfusion.application.dto.operation;

import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;

/**
 * Persistable operation log fields only.
 * Do not put secrets, tokens, raw request bodies, or presigned URLs into this command.
 */
public record RecordOperationLogCommand(
        Long actorUserId,
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
        String detail
) {
}
