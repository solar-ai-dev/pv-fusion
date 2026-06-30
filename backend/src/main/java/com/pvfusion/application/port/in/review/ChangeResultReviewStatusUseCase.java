package com.pvfusion.application.port.in.review;

import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.review.ChangeResultReviewStatusCommand;

public interface ChangeResultReviewStatusUseCase {

    AnalysisResultResponse execute(ChangeResultReviewStatusCommand command);
}
