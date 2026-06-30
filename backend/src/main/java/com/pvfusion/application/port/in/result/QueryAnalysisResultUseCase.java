package com.pvfusion.application.port.in.result;

import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.application.dto.result.AnalysisResultSummaryResponse;
import com.pvfusion.global.response.PageResponse;

public interface QueryAnalysisResultUseCase {

    PageResponse<AnalysisResultSummaryResponse> execute(AnalysisResultListQuery query);
}
