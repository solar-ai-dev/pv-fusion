package com.pvfusion.adapter.out.persistence.tracking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.pvfusion.adapter.out.persistence.defect.DetectedDefectJpaEntity;
import com.pvfusion.adapter.out.persistence.defect.DetectedDefectJpaRepository;
import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.defect.DefectSource;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.SeverityLevel;

@ExtendWith(MockitoExtension.class)
class TrackingPersistenceAdapterTest {

    @Mock
    private TrackingJpaRepository trackingJpaRepository;
    @Mock
    private DetectedDefectJpaRepository detectedDefectJpaRepository;

    private TrackingPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new TrackingPersistenceAdapter(trackingJpaRepository, detectedDefectJpaRepository);
    }

    @Test
    void loadTrackingBuildsSummaryWithPreviousComparison() {
        TrackingResultProjection current = row(100L, 30L, BigDecimal.valueOf(0.9), SeverityLevel.HIGH);
        TrackingResultProjection previous = row(90L, 20L, BigDecimal.valueOf(0.7), SeverityLevel.MEDIUM);

        when(trackingJpaRepository.searchTracking(null, 10L, null, "ZONE", LocalDate.now().minusDays(7), LocalDate.now(), null, null, null, null, null))
                .thenReturn(List.of(current));
        when(trackingJpaRepository.findPreviousTrackingResult(10L, "ZONE", null, "RGB_SINGLE", current.getAnalyzedAt(), 100L))
                .thenReturn(Optional.of(previous));
        when(detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(100L))
                .thenReturn(List.of(defect(1L, 100L, DefectType.HOTSPOT, SeverityLevel.HIGH)));
        when(detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(90L))
                .thenReturn(List.of(defect(2L, 90L, DefectType.SHADING, SeverityLevel.MEDIUM)));

        var items = adapter.loadTracking(new TrackingQuery(
                1L, null, 10L, null, TargetType.ZONE, LocalDate.now().minusDays(7), LocalDate.now(),
                null, null, null, null, null
        ));

        assertThat(items).hasSize(1);
        assertThat(items.get(0).previousResultId()).isEqualTo(90L);
        assertThat(items.get(0).worsened()).isTrue();
    }

    @Test
    void loadInspectionComparisonBuildsDefectSummary() {
        TrackingResultProjection current = row(100L, 30L, BigDecimal.valueOf(0.9), SeverityLevel.HIGH);
        TrackingResultProjection previous = row(90L, 20L, BigDecimal.valueOf(0.7), SeverityLevel.MEDIUM);

        when(trackingJpaRepository.findTrackingResultByResultId(100L)).thenReturn(Optional.of(current));
        when(trackingJpaRepository.findTrackingResultByResultId(90L)).thenReturn(Optional.of(previous));
        when(detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(100L))
                .thenReturn(List.of(defect(1L, 100L, DefectType.HOTSPOT, SeverityLevel.HIGH), defect(3L, 100L, DefectType.SHADING, SeverityLevel.MEDIUM)));
        when(detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(90L))
                .thenReturn(List.of(defect(2L, 90L, DefectType.SHADING, SeverityLevel.MEDIUM)));

        var response = adapter.loadInspectionComparison(new InspectionCompareQuery(1L, 100L, 90L)).orElseThrow();

        assertThat(response.repeatedAnomaly()).isTrue();
        assertThat(response.defectChange().newDefectTypes()).containsExactly(DefectType.HOTSPOT);
        assertThat(response.defectChange().persistentDefectTypes()).containsExactly(DefectType.SHADING);
    }

    @Test
    void loadInspectionComparisonReturnsNullSafeResponseWhenPreviousResultIsMissing() {
        TrackingResultProjection current = row(100L, 30L, BigDecimal.valueOf(0.9), SeverityLevel.HIGH);

        when(trackingJpaRepository.findTrackingResultByResultId(100L)).thenReturn(Optional.of(current));
        when(trackingJpaRepository.findPreviousTrackingResult(10L, "ZONE", null, "RGB_SINGLE", current.getAnalyzedAt(), 100L))
                .thenReturn(Optional.empty());
        when(detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(100L))
                .thenReturn(List.of(defect(1L, 100L, DefectType.HOTSPOT, SeverityLevel.HIGH)));

        var response = adapter.loadInspectionComparison(new InspectionCompareQuery(1L, 100L, null)).orElseThrow();

        assertThat(response.previousResultId()).isNull();
        assertThat(response.previousResult()).isNull();
        assertThat(response.areaChange().previousAreaRatio()).isNull();
        assertThat(response.areaChange().areaRatioDiff()).isNull();
        assertThat(response.severityChange().previousSeverityScore()).isNull();
        assertThat(response.severityChange().severityScoreDiff()).isNull();
        assertThat(response.defectChange().previousDefectCount()).isZero();
        assertThat(response.defectChange().persistentDefectTypes()).isEmpty();
    }

    private TrackingResultProjection row(Long resultId, Long inspectionId, BigDecimal severityScore, SeverityLevel severityLevel) {
        return new TrackingResultProjection() {
            @Override
            public Long getResultId() {
                return resultId;
            }

            @Override
            public Long getAnalysisJobId() {
                return 10L;
            }

            @Override
            public Long getPlantId() {
                return 1L;
            }

            @Override
            public Long getZoneId() {
                return 10L;
            }

            @Override
            public Long getInspectionId() {
                return inspectionId;
            }

            @Override
            public Long getEquipmentId() {
                return null;
            }

            @Override
            public String getTargetType() {
                return "ZONE";
            }

            @Override
            public String getInputType() {
                return "RGB_SINGLE";
            }

            @Override
            public String getModelType() {
                return "RGB_ONLY";
            }

            @Override
            public Integer getAnomalyCount() {
                return 2;
            }

            @Override
            public BigDecimal getAreaRatio() {
                return BigDecimal.valueOf(0.2);
            }

            @Override
            public BigDecimal getSeverityScore() {
                return severityScore;
            }

            @Override
            public String getActionCandidate() {
                return "CLEANING";
            }

            @Override
            public String getPriorityLevel() {
                return "HIGH";
            }

            @Override
            public String getSeverityLevel() {
                return severityLevel.name();
            }

            @Override
            public String getReviewStatus() {
                return "UNCHECKED";
            }

            @Override
            public Instant getAnalyzedAt() {
                return Instant.parse("2026-06-06T01:00:00Z");
            }
        };
    }

    private DetectedDefectJpaEntity defect(Long id, Long resultId, DefectType defectType, SeverityLevel severityLevel) {
        return new DetectedDefectJpaEntity(
                id, resultId, defectType, DefectSource.FUSION, BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.1),
                1, 2, 3, 4, null, null, null, BigDecimal.valueOf(0.8), severityLevel, ActionCandidate.CLEANING
        );
    }
}
