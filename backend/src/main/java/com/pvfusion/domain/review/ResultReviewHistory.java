package com.pvfusion.domain.review;

import com.pvfusion.domain.result.ActionCandidate;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class ResultReviewHistory {

    private final Long id;
    private final Long analysisResultId;
    private final Long reviewerUserId;
    private final ReviewStatus previousReviewStatus;
    private final ReviewStatus newReviewStatus;
    private final ActionCandidate previousActionCandidate;
    private final ActionCandidate newActionCandidate;
    private final String memo;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public ResultReviewHistory(
            Long id,
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
        this.id = id;
        this.analysisResultId = analysisResultId;
        this.reviewerUserId = reviewerUserId;
        this.previousReviewStatus = previousReviewStatus;
        this.newReviewStatus = newReviewStatus;
        this.previousActionCandidate = previousActionCandidate;
        this.newActionCandidate = newActionCandidate;
        this.memo = memo;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
