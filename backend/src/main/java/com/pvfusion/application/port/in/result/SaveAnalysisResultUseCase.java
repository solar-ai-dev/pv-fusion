package com.pvfusion.application.port.in.result;

import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.result.SaveAnalysisResultCommand;

public interface SaveAnalysisResultUseCase {

    AnalysisResultResponse execute(SaveAnalysisResultCommand command);
}
