package com.pvfusion.adapter.out.persistence.defect;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.defect.DetectedDefectListQuery;
import com.pvfusion.domain.defect.DefectSource;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DetectedDefectPersistenceAdapterTest {

    @Mock
    private DetectedDefectJpaRepository detectedDefectJpaRepository;

    private DetectedDefectPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new DetectedDefectPersistenceAdapter(detectedDefectJpaRepository);
    }

    @Test
    void loadDetectedDefectsMapsEntitiesToDomain() {
        when(detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of(new DetectedDefectJpaEntity(
                        2L, 1L, DefectType.HOTSPOT, DefectSource.RGB, BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.1),
                        1, 2, 3, 4, null, null, null, BigDecimal.valueOf(0.8), SeverityLevel.HIGH, ActionCandidate.CLEANING
                )));

        var result = adapter.loadDetectedDefects(new DetectedDefectListQuery(1L, 1L));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDefectType()).isEqualTo(DefectType.HOTSPOT);
    }
}
