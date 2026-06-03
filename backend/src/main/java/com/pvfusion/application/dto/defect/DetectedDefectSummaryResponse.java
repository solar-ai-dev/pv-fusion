package com.pvfusion.application.dto.defect;

import com.pvfusion.domain.defect.DefectSource;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;

public record DetectedDefectSummaryResponse(
        Long defectId,
        DefectType defectType,
        DefectSource defectSource,
        BigDecimal confidence,
        BigDecimal areaRatio,
        SeverityLevel severityLevel,
        ActionCandidate actionCandidate
) {
}
