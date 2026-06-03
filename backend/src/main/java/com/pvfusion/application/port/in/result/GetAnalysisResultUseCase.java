package com.pvfusion.application.port.in.result;

import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.result.GetAnalysisResultQuery;

public interface GetAnalysisResultUseCase {

    AnalysisResultResponse execute(GetAnalysisResultQuery query);
}
