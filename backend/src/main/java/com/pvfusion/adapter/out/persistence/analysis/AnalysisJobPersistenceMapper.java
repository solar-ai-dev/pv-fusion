package com.pvfusion.adapter.out.persistence.analysis;

import com.pvfusion.domain.analysis.AnalysisJob;

public final class AnalysisJobPersistenceMapper {

    private AnalysisJobPersistenceMapper() {
    }

    public static AnalysisJobJpaEntity toEntity(AnalysisJob analysisJob) {
        return new AnalysisJobJpaEntity(
                analysisJob.getId(),
                analysisJob.getImageId(),
                analysisJob.getImagePairId(),
                analysisJob.getInputType(),
                analysisJob.getRequestedModelType(),
                analysisJob.getModelType(),
                analysisJob.getJobStatus(),
                analysisJob.getRequestedByUserId(),
                analysisJob.getRequestedAt(),
                analysisJob.getStartedAt(),
                analysisJob.getCompletedAt(),
                analysisJob.getRetryCount(),
                analysisJob.getTraceId(),
                analysisJob.getFailureCode(),
                analysisJob.getFailureMessage()
        );
    }

    public static AnalysisJob toDomain(AnalysisJobJpaEntity entity) {
        return new AnalysisJob(
                entity.getId(),
                entity.getImageId(),
                entity.getImagePairId(),
                entity.getInputType(),
                entity.getRequestedModelType(),
                entity.getModelType(),
                entity.getJobStatus(),
                entity.getRequestedByUserId(),
                entity.getRequestedAt(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getRetryCount(),
                entity.getTraceId(),
                entity.getFailureCode(),
                entity.getFailureMessage(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
