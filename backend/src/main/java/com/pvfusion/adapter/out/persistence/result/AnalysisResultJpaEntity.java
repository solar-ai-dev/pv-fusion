package com.pvfusion.adapter.out.persistence.result;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "analysis_results")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalysisResultJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long analysisJobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisModelType modelType;

    @Column(nullable = false, length = 100)
    private String modelName;

    @Column(nullable = false, length = 50)
    private String modelVersion;

    @Column(nullable = false, length = 50)
    private String modelFormat;

    @Column(nullable = false, length = 50)
    private String runtime;

    @Column(nullable = false)
    private Integer inputSize;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal threshold;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnalysisResultStatus resultStatus;

    @Column(nullable = false)
    private Integer anomalyCount;

    @Column(precision = 10, scale = 4)
    private BigDecimal maxConfidence;

    @Column(precision = 10, scale = 4)
    private BigDecimal areaRatio;

    @Column(precision = 10, scale = 4)
    private BigDecimal severityScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SeverityLevel severityLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ActionCandidate actionCandidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PriorityLevel priorityLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReviewStatus reviewStatus;

    @Column(length = 255)
    private String bboxBucketName;

    @Column(length = 1024)
    private String bboxObjectKey;

    @Column(length = 1024)
    private String bboxFileUrl;

    @Column(length = 255)
    private String heatmapBucketName;

    @Column(length = 1024)
    private String heatmapObjectKey;

    @Column(length = 1024)
    private String heatmapFileUrl;

    @Column(length = 255)
    private String maskBucketName;

    @Column(length = 1024)
    private String maskObjectKey;

    @Column(length = 1024)
    private String maskFileUrl;

    private OffsetDateTime analyzedAt;

    public AnalysisResultJpaEntity(
            Long id,
            Long analysisJobId,
            AnalysisModelType modelType,
            String modelName,
            String modelVersion,
            String modelFormat,
            String runtime,
            Integer inputSize,
            BigDecimal threshold,
            AnalysisResultStatus resultStatus,
            Integer anomalyCount,
            BigDecimal maxConfidence,
            BigDecimal areaRatio,
            BigDecimal severityScore,
            SeverityLevel severityLevel,
            ActionCandidate actionCandidate,
            PriorityLevel priorityLevel,
            ReviewStatus reviewStatus,
            String bboxBucketName,
            String bboxObjectKey,
            String bboxFileUrl,
            String heatmapBucketName,
            String heatmapObjectKey,
            String heatmapFileUrl,
            String maskBucketName,
            String maskObjectKey,
            String maskFileUrl,
            OffsetDateTime analyzedAt
    ) {
        this.id = id;
        this.analysisJobId = analysisJobId;
        this.modelType = modelType;
        this.modelName = modelName;
        this.modelVersion = modelVersion;
        this.modelFormat = modelFormat;
        this.runtime = runtime;
        this.inputSize = inputSize;
        this.threshold = threshold;
        this.resultStatus = resultStatus;
        this.anomalyCount = anomalyCount;
        this.maxConfidence = maxConfidence;
        this.areaRatio = areaRatio;
        this.severityScore = severityScore;
        this.severityLevel = severityLevel;
        this.actionCandidate = actionCandidate;
        this.priorityLevel = priorityLevel;
        this.reviewStatus = reviewStatus;
        this.bboxBucketName = bboxBucketName;
        this.bboxObjectKey = bboxObjectKey;
        this.bboxFileUrl = bboxFileUrl;
        this.heatmapBucketName = heatmapBucketName;
        this.heatmapObjectKey = heatmapObjectKey;
        this.heatmapFileUrl = heatmapFileUrl;
        this.maskBucketName = maskBucketName;
        this.maskObjectKey = maskObjectKey;
        this.maskFileUrl = maskFileUrl;
        this.analyzedAt = analyzedAt;
    }
}
