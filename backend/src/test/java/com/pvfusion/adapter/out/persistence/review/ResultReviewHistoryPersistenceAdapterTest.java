package com.pvfusion.adapter.out.persistence.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.review.ResultReviewHistoryQuery;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.review.ReviewStatus;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ResultReviewHistoryPersistenceAdapterTest {

    @Mock
    private ResultReviewHistoryJpaRepository resultReviewHistoryJpaRepository;

    private ResultReviewHistoryPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ResultReviewHistoryPersistenceAdapter(resultReviewHistoryJpaRepository);
    }

    @Test
    void loadReviewHistoriesMapsEntitiesToDomain() {
        when(resultReviewHistoryJpaRepository.findByAnalysisResultIdOrderByCreatedAtDescIdDesc(1L))
                .thenReturn(List.of(new ResultReviewHistoryJpaEntity(
                        3L, 1L, 2L, ReviewStatus.UNCHECKED, ReviewStatus.CONFIRMED,
                        ActionCandidate.CLEANING, ActionCandidate.FIELD_INSPECTION, "memo"
                )));

        var result = adapter.loadResultReviewHistories(new ResultReviewHistoryQuery(1L, 1L));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNewReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
    }
}
