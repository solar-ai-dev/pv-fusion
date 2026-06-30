package com.pvfusion.application.port.in.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobResponse;
import com.pvfusion.application.dto.analysis.RetryAnalysisJobCommand;

public interface RetryAnalysisJobUseCase {

    AnalysisJobResponse execute(RetryAnalysisJobCommand command);
}
