package com.pvfusion.adapter.out.persistence.inspection;

import com.pvfusion.domain.inspection.Inspection;

public final class InspectionPersistenceMapper {

    private InspectionPersistenceMapper() {
    }

    public static InspectionJpaEntity toEntity(Inspection inspection) {
        return new InspectionJpaEntity(
                inspection.getId(),
                inspection.getZoneId(),
                inspection.getName(),
                inspection.getCapturedAt(),
                inspection.getCaptureMethod(),
                inspection.getInspectorName(),
                inspection.getMemo(),
                inspection.getInspectionStatus(),
                inspection.getCreatedByUserId()
        );
    }

    public static Inspection toDomain(InspectionJpaEntity entity) {
        return new Inspection(
                entity.getId(),
                entity.getZoneId(),
                entity.getName(),
                entity.getCapturedAt(),
                entity.getCaptureMethod(),
                entity.getInspectorName(),
                entity.getMemo(),
                entity.getInspectionStatus(),
                entity.getCreatedByUserId(),
                entity.getCreatedAtOffsetDateTime(),
                entity.getUpdatedAtOffsetDateTime()
        );
    }
}
