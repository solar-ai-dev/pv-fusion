package com.pvfusion.application.port.in.tracking;

import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;

public interface CompareInspectionResultUseCase {

    InspectionCompareResponse execute(InspectionCompareQuery query);
}
