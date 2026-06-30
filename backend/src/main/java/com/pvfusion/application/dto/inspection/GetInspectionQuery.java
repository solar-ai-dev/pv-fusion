package com.pvfusion.application.dto.inspection;

public record GetInspectionQuery(
        Long actorUserId,
        Long inspectionId
) {
    public GetInspectionQuery(Long inspectionId) {
        this(null, inspectionId);
    }
}
