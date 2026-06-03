package com.pvfusion.domain.result;

import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.review.ReviewStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class AnalysisResult {

    private final Long id;
    private final Long analysisJobId;
    private final AnalysisModelType modelType;
    private final String modelName;
    private final String modelVersion;
    private final String modelFormat;
    private final String runtime;
    private final Integer inputSize;
    private final BigDecimal threshold;
    private final AnalysisResultStatus resultStatus;
    private final Integer anomalyCount;
    private final BigDecimal maxConfidence;
    private final BigDecimal areaRatio;
    private final BigDecimal severityScore;
    private final SeverityLevel severityLevel;
    private final ActionCandidate actionCandidate;
    private final PriorityLevel priorityLevel;
    private final ReviewStatus reviewStatus;
    private final String bboxBucketName;
    private final String bboxObjectKey;
    private final String bboxFileUrl;
    private final String heatmapBucketName;
    private final String heatmapObjectKey;
    private final String heatmapFileUrl;
    private final String maskBucketName;
    private final String maskObjectKey;
    private final String maskFileUrl;
    private final OffsetDateTime analyzedAt;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public AnalysisResult(
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
            OffsetDateTime analyzedAt,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
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
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
