package com.pvfusion.adapter.out.persistence.result;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResult;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class AnalysisResultPersistenceAdapterTest {

    @Mock
    private AnalysisResultJpaRepository analysisResultJpaRepository;

    private AnalysisResultPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new AnalysisResultPersistenceAdapter(analysisResultJpaRepository);
    }

    @Test
    void loadAnalysisResultByJobIdMapsEntityToDomain() {
        AnalysisResultJpaEntity entity = entity();
        when(analysisResultJpaRepository.findByAnalysisJobId(10L)).thenReturn(Optional.of(entity));

        Optional<AnalysisResult> result = adapter.loadAnalysisResultByAnalysisJobId(10L);

        assertThat(result).isPresent();
        assertThat(result.get().getAnalysisJobId()).isEqualTo(10L);
    }

    @Test
    void loadAnalysisResultsUsesRepositorySearch() {
        when(analysisResultJpaRepository.search(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(entity())));

        List<AnalysisResult> result = adapter.loadAnalysisResults(new AnalysisResultListQuery(
                1L, null, null, 30L, null, null, AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.SUCCEEDED, AnalysisResultStatus.ANOMALY, ActionCandidate.CLEANING,
                SeverityLevel.HIGH, ReviewStatus.UNCHECKED, null, null, 0, 20
        ));

        verify(analysisResultJpaRepository).search(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(PageRequest.class));
        assertThat(result).hasSize(1);
    }

    @Test
    void loadAnalysisResultsUsesUnsortedPageRequestForNativeQuery() {
        when(analysisResultJpaRepository.search(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        adapter.loadAnalysisResults(new AnalysisResultListQuery(
                1L, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, 20
        ));

        ArgumentCaptor<PageRequest> pageableCaptor = ArgumentCaptor.forClass(PageRequest.class);
        verify(analysisResultJpaRepository).search(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), pageableCaptor.capture()
        );
        Assertions.assertTrue(pageableCaptor.getValue().getSort().isUnsorted());
    }

    private AnalysisResultJpaEntity entity() {
        return new AnalysisResultJpaEntity(
                1L, 10L, AnalysisModelType.RGB_ONLY, "model-a", "1.0", "onnx", "cpu", 640, BigDecimal.valueOf(0.75),
                AnalysisResultStatus.ANOMALY, 2, BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.8),
                SeverityLevel.HIGH, ActionCandidate.CLEANING, PriorityLevel.HIGH, ReviewStatus.UNCHECKED,
                "bucket", "bbox-key", null, null, null, null, null, null, null, OffsetDateTime.now()
        );
    }
}
