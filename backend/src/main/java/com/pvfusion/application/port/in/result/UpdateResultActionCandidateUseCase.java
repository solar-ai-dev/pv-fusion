package com.pvfusion.application.port.in.result;

import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.result.UpdateResultActionCandidateCommand;

public interface UpdateResultActionCandidateUseCase {

    AnalysisResultResponse execute(UpdateResultActionCandidateCommand command);
}
