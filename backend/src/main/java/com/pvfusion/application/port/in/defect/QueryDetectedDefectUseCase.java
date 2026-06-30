package com.pvfusion.application.port.in.defect;

import com.pvfusion.application.dto.defect.DetectedDefectListQuery;
import com.pvfusion.application.dto.defect.DetectedDefectSummaryResponse;
import java.util.List;

public interface QueryDetectedDefectUseCase {

    List<DetectedDefectSummaryResponse> execute(DetectedDefectListQuery query);
}
