package com.pvfusion.application.port.in.defect;

import com.pvfusion.application.dto.defect.DetectedDefectResponse;
import com.pvfusion.application.dto.defect.GetDetectedDefectQuery;

public interface GetDetectedDefectUseCase {

    DetectedDefectResponse execute(GetDetectedDefectQuery query);
}
