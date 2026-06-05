package com.pvfusion.adapter.out.persistence.review;

import com.pvfusion.application.dto.review.ResultReviewHistoryQuery;
import com.pvfusion.application.port.out.review.LoadResultReviewHistoryPort;
import com.pvfusion.application.port.out.review.SaveResultReviewHistoryPort;
import com.pvfusion.domain.review.ResultReviewHistory;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ResultReviewHistoryPersistenceAdapter implements LoadResultReviewHistoryPort, SaveResultReviewHistoryPort {

    private final ResultReviewHistoryJpaRepository resultReviewHistoryJpaRepository;

    @Override
    public Optional<ResultReviewHistory> loadResultReviewHistory(Long reviewHistoryId) {
        return resultReviewHistoryJpaRepository.findById(reviewHistoryId)
                .map(ResultReviewHistoryPersistenceMapper::toDomain);
    }

    @Override
    public List<ResultReviewHistory> loadResultReviewHistories(ResultReviewHistoryQuery query) {
        return resultReviewHistoryJpaRepository.findByAnalysisResultIdOrderByCreatedAtDescIdDesc(query.analysisResultId())
                .stream()
                .map(ResultReviewHistoryPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public ResultReviewHistory saveResultReviewHistory(ResultReviewHistory history) {
        return ResultReviewHistoryPersistenceMapper.toDomain(
                resultReviewHistoryJpaRepository.save(ResultReviewHistoryPersistenceMapper.toEntity(history))
        );
    }
}
