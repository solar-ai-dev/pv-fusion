package com.pvfusion.application.dto.tracking;

import com.pvfusion.domain.defect.DefectType;
import java.util.List;

public record DefectChangeResponse(
        Integer currentDefectCount,
        Integer previousDefectCount,
        Integer defectCountDiff,
        List<DefectType> newDefectTypes,
        List<DefectType> resolvedDefectTypes,
        List<DefectType> persistentDefectTypes
) {
}
