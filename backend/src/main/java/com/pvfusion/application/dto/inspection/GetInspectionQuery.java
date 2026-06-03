package com.pvfusion.application.dto.inspection;

public record GetInspectionQuery(
        Long actorUserId,
        Long inspectionId
) {
}
