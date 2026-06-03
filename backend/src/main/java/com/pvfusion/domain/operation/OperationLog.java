package com.pvfusion.domain.operation;

import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class OperationLog {

    private final Long id;
    private final Long actorUserId;
    private final OperationEventCategory eventCategory;
    private final OperationEventType eventType;
    private final String targetTable;
    private final Long targetId;
    private final Long plantId;
    private final Long zoneId;
    private final Long inspectionId;
    private final Long imageId;
    private final Long imagePairId;
    private final Long analysisJobId;
    private final Long analysisResultId;
    private final String ipAddress;
    private final String userAgent;
    private final String message;
    private final String detail;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public OperationLog(
            Long id,
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
            String ipAddress,
            String userAgent,
            String message,
            String detail,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.actorUserId = actorUserId;
        this.eventCategory = eventCategory;
        this.eventType = eventType;
        this.targetTable = targetTable;
        this.targetId = targetId;
        this.plantId = plantId;
        this.zoneId = zoneId;
        this.inspectionId = inspectionId;
        this.imageId = imageId;
        this.imagePairId = imagePairId;
        this.analysisJobId = analysisJobId;
        this.analysisResultId = analysisResultId;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.message = message;
        this.detail = detail;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
