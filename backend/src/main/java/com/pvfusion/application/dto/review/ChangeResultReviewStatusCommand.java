package com.pvfusion.application.dto.review;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.review.ReviewStatus;

public record ChangeResultReviewStatusCommand(
        Long actorUserId,
        Long resultId,
        ReviewStatus reviewStatus,
        ActionCandidate actionCandidate,
        String memo
) {
}
