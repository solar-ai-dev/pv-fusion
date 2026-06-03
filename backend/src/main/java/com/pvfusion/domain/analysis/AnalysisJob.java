package com.pvfusion.domain.analysis;

import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class AnalysisJob {

    private final Long id;
    private final Long imageId;
    private final Long imagePairId;
    private final AnalysisInputType inputType;
    private final RequestedModelType requestedModelType;
    private final AnalysisModelType modelType;
    private final AnalysisJobStatus jobStatus;
    private final Long requestedByUserId;
    private final OffsetDateTime requestedAt;
    private final OffsetDateTime startedAt;
    private final OffsetDateTime completedAt;
    private final String failureCode;
    private final String failureMessage;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public AnalysisJob(
            Long id,
            Long imageId,
            Long imagePairId,
            AnalysisInputType inputType,
            RequestedModelType requestedModelType,
            AnalysisModelType modelType,
            AnalysisJobStatus jobStatus,
            Long requestedByUserId,
            OffsetDateTime requestedAt,
            OffsetDateTime startedAt,
            OffsetDateTime completedAt,
            String failureCode,
            String failureMessage,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.imageId = imageId;
        this.imagePairId = imagePairId;
        this.inputType = inputType;
        this.requestedModelType = requestedModelType;
        this.modelType = modelType;
        this.jobStatus = jobStatus;
        this.requestedByUserId = requestedByUserId;
        this.requestedAt = requestedAt;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.failureCode = failureCode;
        this.failureMessage = failureMessage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
