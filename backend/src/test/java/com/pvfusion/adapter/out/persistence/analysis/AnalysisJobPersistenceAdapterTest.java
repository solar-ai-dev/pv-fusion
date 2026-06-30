package com.pvfusion.adapter.out.persistence.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class AnalysisJobPersistenceAdapterTest {

    @Mock
    private AnalysisJobJpaRepository analysisJobJpaRepository;

    private AnalysisJobPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new AnalysisJobPersistenceAdapter(analysisJobJpaRepository);
    }

    @Test
    void loadAnalysisJobMapsEntityToDomain() {
        AnalysisJobJpaEntity entity = new AnalysisJobJpaEntity(
                1L, 10L, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED, 1L, OffsetDateTime.now(), null, null, 0, "trace", null, null
        );

        when(analysisJobJpaRepository.findById(1L)).thenReturn(Optional.of(entity));

        Optional<AnalysisJob> result = adapter.loadAnalysisJob(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getTraceId()).isEqualTo("trace");
    }

    @Test
    void loadAnalysisJobsUsesRepositorySearch() {
        AnalysisJobJpaEntity entity = new AnalysisJobJpaEntity(
                1L, 10L, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED, 1L, OffsetDateTime.now(), null, null, 0, "trace", null, null
        );
        AnalysisJobListQuery query = new AnalysisJobListQuery(1L, null, null, 20L, AnalysisJobStatus.QUEUED, AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY, 0, 20);

        when(analysisJobJpaRepository.search(any(), any(), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        List<AnalysisJob> result = adapter.loadAnalysisJobs(query);

        verify(analysisJobJpaRepository).search(any(), any(), any(), any(), any(), any(), any(PageRequest.class));
        assertThat(result).hasSize(1);
    }
}
