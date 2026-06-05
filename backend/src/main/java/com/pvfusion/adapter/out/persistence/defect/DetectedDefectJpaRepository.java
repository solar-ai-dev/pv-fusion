package com.pvfusion.adapter.out.persistence.defect;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DetectedDefectJpaRepository extends JpaRepository<DetectedDefectJpaEntity, Long> {

    List<DetectedDefectJpaEntity> findByAnalysisResultIdOrderByCreatedAtAscIdAsc(Long analysisResultId);
}
