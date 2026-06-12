package com.pvfusion.domain.inspection;

import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
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

    public Inspection changeStatus(InspectionStatus nextStatus) {
        if (nextStatus == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "inspectionStatus is required.");
        }
        if (!canTransitionTo(nextStatus)) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT,
                    "Inspection status transition is not allowed: " + inspectionStatus + " -> " + nextStatus
            );
        }

        return new Inspection(
                id,
                zoneId,
                name,
                capturedAt,
                captureMethod,
                inspectorName,
                memo,
                nextStatus,
                createdByUserId,
                createdAt,
                OffsetDateTime.now()
        );
    }

    private boolean canTransitionTo(InspectionStatus nextStatus) {
        return switch (inspectionStatus) {
            case READY -> nextStatus == InspectionStatus.ANALYZING;
            case ANALYZING -> nextStatus == InspectionStatus.COMPLETED
                    || nextStatus == InspectionStatus.FAILED;
            case FAILED -> nextStatus == InspectionStatus.ANALYZING;
            case COMPLETED, UPLOADING -> false;
        };
    }
}
