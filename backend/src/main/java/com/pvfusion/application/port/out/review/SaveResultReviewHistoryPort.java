package com.pvfusion.application.port.out.review;

import com.pvfusion.domain.review.ResultReviewHistory;

public interface SaveResultReviewHistoryPort {

    ResultReviewHistory saveResultReviewHistory(ResultReviewHistory history);
}
