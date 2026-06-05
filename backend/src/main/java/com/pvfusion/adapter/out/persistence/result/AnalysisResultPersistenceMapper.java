package com.pvfusion.adapter.out.persistence.result;

import com.pvfusion.domain.result.AnalysisResult;

public final class AnalysisResultPersistenceMapper {

    private AnalysisResultPersistenceMapper() {
    }

    public static AnalysisResultJpaEntity toEntity(AnalysisResult result) {
        return new AnalysisResultJpaEntity(
                result.getId(),
                result.getAnalysisJobId(),
                result.getModelType(),
                result.getModelName(),
                result.getModelVersion(),
                result.getModelFormat(),
                result.getRuntime(),
                result.getInputSize(),
                result.getThreshold(),
                result.getResultStatus(),
                result.getAnomalyCount(),
                result.getMaxConfidence(),
                result.getAreaRatio(),
                result.getSeverityScore(),
                result.getSeverityLevel(),
                result.getActionCandidate(),
                result.getPriorityLevel(),
                result.getReviewStatus(),
                result.getBboxBucketName(),
                result.getBboxObjectKey(),
                result.getBboxFileUrl(),
                result.getHeatmapBucketName(),
                result.getHeatmapObjectKey(),
                result.getHeatmapFileUrl(),
                result.getMaskBucketName(),
                result.getMaskObjectKey(),
                result.getMaskFileUrl(),
                result.getAnalyzedAt()
        );
    }

    public static AnalysisResult toDomain(AnalysisResultJpaEntity entity) {
        return new AnalysisResult(
                entity.getId(),
                entity.getAnalysisJobId(),
                entity.getModelType(),
                entity.getModelName(),
                entity.getModelVersion(),
                entity.getModelFormat(),
                entity.getRuntime(),
                entity.getInputSize(),
                entity.getThreshold(),
                entity.getResultStatus(),
                entity.getAnomalyCount(),
                entity.getMaxConfidence(),
                entity.getAreaRatio(),
                entity.getSeverityScore(),
                entity.getSeverityLevel(),
                entity.getActionCandidate(),
                entity.getPriorityLevel(),
                entity.getReviewStatus(),
                entity.getBboxBucketName(),
                entity.getBboxObjectKey(),
                entity.getBboxFileUrl(),
                entity.getHeatmapBucketName(),
                entity.getHeatmapObjectKey(),
                entity.getHeatmapFileUrl(),
                entity.getMaskBucketName(),
                entity.getMaskObjectKey(),
                entity.getMaskFileUrl(),
                entity.getAnalyzedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
