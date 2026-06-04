package com.pvfusion.application.port.in.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobResponse;
import com.pvfusion.application.dto.analysis.RequestAnalysisCommand;

public interface RequestAnalysisUseCase {

    AnalysisJobResponse execute(RequestAnalysisCommand command);
}
