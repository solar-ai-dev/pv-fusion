package com.pvfusion.adapter.out.persistence.analysis;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "analysis_jobs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalysisJobJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long imageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisInputType inputType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RequestedModelType requestedModelType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisModelType modelType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisJobStatus jobStatus;

    @Column(nullable = false)
    private Long requestedByUserId;

    @Column(nullable = false)
    private OffsetDateTime requestedAt;

    private OffsetDateTime startedAt;

    private OffsetDateTime completedAt;

    @Column(nullable = false)
    private Integer retryCount;

    @Column(length = 255)
    private String traceId;

    @Column(length = 100)
    private String failureCode;

    @Column(columnDefinition = "TEXT")
    private String failureMessage;

    public AnalysisJobJpaEntity(
            Long id,
            Long imageId,
            AnalysisInputType inputType,
            RequestedModelType requestedModelType,
            AnalysisModelType modelType,
            AnalysisJobStatus jobStatus,
            Long requestedByUserId,
            OffsetDateTime requestedAt,
            OffsetDateTime startedAt,
            OffsetDateTime completedAt,
            Integer retryCount,
            String traceId,
            String failureCode,
            String failureMessage
    ) {
        this.id = id;
        this.imageId = imageId;
        this.inputType = inputType;
        this.requestedModelType = requestedModelType;
        this.modelType = modelType;
        this.jobStatus = jobStatus;
        this.requestedByUserId = requestedByUserId;
        this.requestedAt = requestedAt;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.retryCount = retryCount;
        this.traceId = traceId;
        this.failureCode = failureCode;
        this.failureMessage = failureMessage;
    }
}
