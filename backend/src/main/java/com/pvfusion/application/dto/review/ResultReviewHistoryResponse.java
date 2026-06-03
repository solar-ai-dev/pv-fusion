package com.pvfusion.application.dto.review;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.review.ReviewStatus;
import java.time.OffsetDateTime;

public record ResultReviewHistoryResponse(
        Long reviewHistoryId,
        Long analysisResultId,
        Long reviewerUserId,
        ReviewStatus previousReviewStatus,
        ReviewStatus newReviewStatus,
        ActionCandidate previousActionCandidate,
        ActionCandidate newActionCandidate,
        String memo,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
