package com.pvfusion.application.port.in.inspection;

import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.application.dto.inspection.InspectionSummaryResponse;
import com.pvfusion.global.response.PageResponse;

public interface QueryInspectionUseCase {

    PageResponse<InspectionSummaryResponse> execute(InspectionListQuery query);
}
