package com.pvfusion.application.port.in.review;

import com.pvfusion.application.dto.review.ChangeResultReviewStatusCommand;
import com.pvfusion.application.dto.review.ResultReviewHistoryResponse;

public interface ChangeResultReviewStatusUseCase {

    ResultReviewHistoryResponse execute(ChangeResultReviewStatusCommand command);
}
