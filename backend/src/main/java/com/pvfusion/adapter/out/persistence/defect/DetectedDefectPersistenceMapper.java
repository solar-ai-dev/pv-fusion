package com.pvfusion.adapter.out.persistence.defect;

import com.pvfusion.domain.defect.DetectedDefect;

public final class DetectedDefectPersistenceMapper {

    private DetectedDefectPersistenceMapper() {
    }

    public static DetectedDefectJpaEntity toEntity(DetectedDefect defect) {
        return new DetectedDefectJpaEntity(
                defect.getId(),
                defect.getAnalysisResultId(),
                defect.getDefectType(),
                defect.getDefectSource(),
                defect.getConfidence(),
                defect.getAreaRatio(),
                defect.getBboxX(),
                defect.getBboxY(),
                defect.getBboxWidth(),
                defect.getBboxHeight(),
                defect.getMaskBucketName(),
                defect.getMaskObjectKey(),
                defect.getMaskFileUrl(),
                defect.getSeverityScore(),
                defect.getSeverityLevel(),
                defect.getActionCandidate()
        );
    }

    public static DetectedDefect toDomain(DetectedDefectJpaEntity entity) {
        return new DetectedDefect(
                entity.getId(),
                entity.getAnalysisResultId(),
                entity.getDefectType(),
                entity.getDefectSource(),
                entity.getConfidence(),
                entity.getAreaRatio(),
                entity.getBboxX(),
                entity.getBboxY(),
                entity.getBboxWidth(),
                entity.getBboxHeight(),
                entity.getMaskBucketName(),
                entity.getMaskObjectKey(),
                entity.getMaskFileUrl(),
                entity.getSeverityScore(),
                entity.getSeverityLevel(),
                entity.getActionCandidate(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
