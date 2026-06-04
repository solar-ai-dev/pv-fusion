package com.pvfusion.application.port.out.review;

import com.pvfusion.application.dto.review.ResultReviewHistoryQuery;
import com.pvfusion.domain.review.ResultReviewHistory;
import java.util.List;
import java.util.Optional;

public interface LoadResultReviewHistoryPort {

    Optional<ResultReviewHistory> loadResultReviewHistory(Long reviewHistoryId);

    List<ResultReviewHistory> loadResultReviewHistories(ResultReviewHistoryQuery query);
}
