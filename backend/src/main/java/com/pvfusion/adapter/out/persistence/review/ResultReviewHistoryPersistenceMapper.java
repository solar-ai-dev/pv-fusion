package com.pvfusion.adapter.out.persistence.review;

import com.pvfusion.domain.review.ResultReviewHistory;

public final class ResultReviewHistoryPersistenceMapper {

    private ResultReviewHistoryPersistenceMapper() {
    }

    public static ResultReviewHistoryJpaEntity toEntity(ResultReviewHistory history) {
        return new ResultReviewHistoryJpaEntity(
                history.getId(),
                history.getAnalysisResultId(),
                history.getReviewerUserId(),
                history.getPreviousReviewStatus(),
                history.getNewReviewStatus(),
                history.getPreviousActionCandidate(),
                history.getNewActionCandidate(),
                history.getMemo()
        );
    }

    public static ResultReviewHistory toDomain(ResultReviewHistoryJpaEntity entity) {
        return new ResultReviewHistory(
                entity.getId(),
                entity.getAnalysisResultId(),
                entity.getReviewerUserId(),
                entity.getPreviousReviewStatus(),
                entity.getNewReviewStatus(),
                entity.getPreviousActionCandidate(),
                entity.getNewActionCandidate(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
