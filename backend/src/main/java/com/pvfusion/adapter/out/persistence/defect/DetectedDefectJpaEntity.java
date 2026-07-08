package com.pvfusion.adapter.out.persistence.defect;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.defect.DefectSource;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.SeverityLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "detected_defects")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DetectedDefectJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "analysis_result_id", nullable = false)
    private Long analysisResultId;

    @Convert(converter = DefectTypeJpaConverter.class)
    @Column(nullable = false, length = 50)
    private DefectType defectType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DefectSource defectSource;

    @Column(precision = 10, scale = 4)
    private BigDecimal confidence;

    @Column(precision = 10, scale = 4)
    private BigDecimal areaRatio;

    @Column(name = "bbox_x")
    private Integer bboxX;

    @Column(name = "bbox_y")
    private Integer bboxY;

    @Column(name = "bbox_width")
    private Integer bboxWidth;

    @Column(name = "bbox_height")
    private Integer bboxHeight;

    @Column(length = 255)
    private String maskBucketName;

    @Column(length = 1024)
    private String maskObjectKey;

    @Column(length = 1024)
    private String maskFileUrl;

    @Column(precision = 10, scale = 4)
    private BigDecimal severityScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SeverityLevel severityLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ActionCandidate actionCandidate;

    public DetectedDefectJpaEntity(
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
            ActionCandidate actionCandidate
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
    }
}
