package com.pvfusion.application.port.in.review;

import com.pvfusion.application.dto.review.ResultReviewHistoryQuery;
import com.pvfusion.application.dto.review.ResultReviewHistorySummaryResponse;
import java.util.List;

public interface QueryResultReviewHistoryUseCase {

    List<ResultReviewHistorySummaryResponse> execute(ResultReviewHistoryQuery query);
}
