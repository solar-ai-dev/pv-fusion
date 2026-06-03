package com.pvfusion.application.port.in.inspection;

import com.pvfusion.application.dto.inspection.GetInspectionQuery;
import com.pvfusion.application.dto.inspection.InspectionResponse;

public interface GetInspectionUseCase {

    InspectionResponse execute(GetInspectionQuery query);
}
