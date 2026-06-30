package com.pvfusion.adapter.in.web.result;

import com.pvfusion.domain.defect.DefectSource;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;

public record SaveDetectedDefectRequest(
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
}
