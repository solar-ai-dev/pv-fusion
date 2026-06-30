package com.pvfusion.adapter.out.persistence.review;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.review.ReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "result_review_histories")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ResultReviewHistoryJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long analysisResultId;

    @Column(nullable = false)
    private Long reviewerUserId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ReviewStatus previousReviewStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReviewStatus newReviewStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ActionCandidate previousActionCandidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ActionCandidate newActionCandidate;

    @Column(columnDefinition = "TEXT")
    private String memo;

    public ResultReviewHistoryJpaEntity(
            Long id,
            Long analysisResultId,
            Long reviewerUserId,
            ReviewStatus previousReviewStatus,
            ReviewStatus newReviewStatus,
            ActionCandidate previousActionCandidate,
            ActionCandidate newActionCandidate,
            String memo
    ) {
        this.id = id;
        this.analysisResultId = analysisResultId;
        this.reviewerUserId = reviewerUserId;
        this.previousReviewStatus = previousReviewStatus;
        this.newReviewStatus = newReviewStatus;
        this.previousActionCandidate = previousActionCandidate;
        this.newActionCandidate = newActionCandidate;
        this.memo = memo;
    }
}
