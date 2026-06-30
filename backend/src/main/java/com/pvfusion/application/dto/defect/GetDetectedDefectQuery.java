package com.pvfusion.application.dto.defect;

public record GetDetectedDefectQuery(
        Long actorUserId,
        Long defectId
) {
}
