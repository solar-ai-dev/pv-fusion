package com.pvfusion.domain.defect;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class DetectedDefect {

    private final Long id;
    private final Long analysisResultId;
    private final DefectType defectType;
    private final DefectSource defectSource;
    private final BigDecimal confidence;
    private final BigDecimal areaRatio;
    private final Integer bboxX;
    private final Integer bboxY;
    private final Integer bboxWidth;
    private final Integer bboxHeight;
    private final String maskBucketName;
    private final String maskObjectKey;
    private final String maskFileUrl;
    private final BigDecimal severityScore;
    private final SeverityLevel severityLevel;
    private final ActionCandidate actionCandidate;
    private final Integer modelClassId;
    private final String modelClassName;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public DetectedDefect(
            Long id,
            Long analysisResultId,
            DefectType defectType,
            DefectSource defectSource,
            BigDecimal confidence,
            BigDecimal areaRatio,
            Integer bboxX,
            Integer bboxY,
            Integer bboxWidth,
            Integer bboxHeight,
            String maskBucketName,
            String maskObjectKey,
            String maskFileUrl,
            BigDecimal severityScore,
            SeverityLevel severityLevel,
            ActionCandidate actionCandidate,
            Integer modelClassId,
            String modelClassName,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.analysisResultId = analysisResultId;
        this.defectType = defectType;
        this.defectSource = defectSource;
        this.confidence = confidence;
        this.areaRatio = areaRatio;
        this.bboxX = bboxX;
        this.bboxY = bboxY;
        this.bboxWidth = bboxWidth;
        this.bboxHeight = bboxHeight;
        this.maskBucketName = maskBucketName;
        this.maskObjectKey = maskObjectKey;
        this.maskFileUrl = maskFileUrl;
        this.severityScore = severityScore;
        this.severityLevel = severityLevel;
        this.actionCandidate = actionCandidate;
        this.modelClassId = modelClassId;
        this.modelClassName = modelClassName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
