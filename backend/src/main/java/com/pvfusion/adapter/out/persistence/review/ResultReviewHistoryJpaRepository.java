package com.pvfusion.adapter.out.persistence.review;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResultReviewHistoryJpaRepository extends JpaRepository<ResultReviewHistoryJpaEntity, Long> {

    List<ResultReviewHistoryJpaEntity> findByAnalysisResultIdOrderByCreatedAtDescIdDesc(Long analysisResultId);
}
