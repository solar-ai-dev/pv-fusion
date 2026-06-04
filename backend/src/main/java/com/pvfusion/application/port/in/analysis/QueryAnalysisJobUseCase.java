package com.pvfusion.application.port.in.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.dto.analysis.AnalysisJobSummaryResponse;
import com.pvfusion.global.response.PageResponse;

public interface QueryAnalysisJobUseCase {

    PageResponse<AnalysisJobSummaryResponse> execute(AnalysisJobListQuery query);
}
