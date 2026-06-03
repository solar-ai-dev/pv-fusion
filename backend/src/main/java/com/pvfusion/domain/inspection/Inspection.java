package com.pvfusion.domain.inspection;

import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class Inspection {

    private final Long id;
    private final Long zoneId;
    private final String name;
    private final OffsetDateTime capturedAt;
    private final CaptureMethod captureMethod;
    private final String inspectorName;
    private final String memo;
    private final InspectionStatus inspectionStatus;
    private final Long createdByUserId;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public Inspection(
            Long id,
            Long zoneId,
            String name,
            OffsetDateTime capturedAt,
            CaptureMethod captureMethod,
            String inspectorName,
            String memo,
            InspectionStatus inspectionStatus,
            Long createdByUserId,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.zoneId = zoneId;
        this.name = name;
        this.capturedAt = capturedAt;
        this.captureMethod = captureMethod;
        this.inspectorName = inspectorName;
        this.memo = memo;
        this.inspectionStatus = inspectionStatus;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
