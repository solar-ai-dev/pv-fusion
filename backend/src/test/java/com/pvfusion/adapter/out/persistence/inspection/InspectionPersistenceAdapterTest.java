package com.pvfusion.adapter.out.persistence.inspection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.inspection.InspectionStatus;
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
class InspectionPersistenceAdapterTest {

    @Mock
    private InspectionJpaRepository inspectionJpaRepository;

    private InspectionPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new InspectionPersistenceAdapter(inspectionJpaRepository);
    }

    @Test
    void loadInspectionMapsEntityToDomain() {
        InspectionJpaEntity entity = new InspectionJpaEntity(
                1L, 10L, "Inspection", OffsetDateTime.now(), CaptureMethod.DRONE,
                "Inspector", "Memo", InspectionStatus.READY, 1L
        );

        when(inspectionJpaRepository.findById(1L)).thenReturn(Optional.of(entity));

        Optional<Inspection> result = adapter.loadInspection(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getZoneId()).isEqualTo(10L);
    }

    @Test
    void loadInspectionsUsesRepositorySearch() {
        InspectionJpaEntity entity = new InspectionJpaEntity(
                1L, 10L, "Inspection", OffsetDateTime.now(), CaptureMethod.DRONE,
                "Inspector", "Memo", InspectionStatus.READY, 1L
        );
        InspectionListQuery query = new InspectionListQuery(1L, null, 10L, InspectionStatus.READY, null, null, 0, 20);

        when(inspectionJpaRepository.search(any(), any(), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        List<Inspection> result = adapter.loadInspections(query);

        verify(inspectionJpaRepository).search(any(), any(), any(), any(), any(), any(), any(PageRequest.class));
        assertThat(result).hasSize(1);
    }
}
