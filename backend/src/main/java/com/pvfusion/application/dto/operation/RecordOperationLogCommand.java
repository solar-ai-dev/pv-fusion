package com.pvfusion.application.dto.operation;

import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;

public record RecordOperationLogCommand(
        Long actorUserId,
        String actorEmail,
        String actorRole,
        OperationEventCategory eventCategory,
        OperationEventType eventType,
        String targetType,
        Long targetId,
        String action,
        Long plantId,
        Long zoneId,
        Long inspectionId,
        Long imageId,
        Long imagePairId,
        Long analysisJobId,
        Long analysisResultId,
        String message,
        String requestPath,
        String httpMethod,
        String clientIp,
        String traceId,
        String detail
) {
}
