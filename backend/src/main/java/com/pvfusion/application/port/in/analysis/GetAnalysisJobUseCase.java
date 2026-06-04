package com.pvfusion.application.port.in.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobResponse;
import com.pvfusion.application.dto.analysis.GetAnalysisJobQuery;

public interface GetAnalysisJobUseCase {

    AnalysisJobResponse execute(GetAnalysisJobQuery query);
}
