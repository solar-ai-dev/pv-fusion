package com.pvfusion.service.tracking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.tracking.AreaChangeResponse;
import com.pvfusion.application.dto.tracking.DefectChangeResponse;
import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.TrackingSummaryResponse;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.tracking.LoadInspectionComparisonPort;
import com.pvfusion.application.port.out.tracking.LoadTrackingPort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResult;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TrackingServiceTest {

    @Mock
    private LoadTrackingPort loadTrackingPort;
    @Mock
    private LoadInspectionComparisonPort loadInspectionComparisonPort;
    @Mock
    private LoadAnalysisResultPort loadAnalysisResultPort;
    @Mock
    private AccessChecker accessChecker;
    @Mock
    private CurrentUserPort currentUserPort;

    private TrackingService trackingService;

    @BeforeEach
    void setUp() {
        trackingService = new TrackingService(
                loadTrackingPort,
                loadInspectionComparisonPort,
                loadAnalysisResultPort,
                accessChecker,
                currentUserPort
        );
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
    }

    @Test
    void queryTrackingAutoScopesForNonAdmin() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(loadTrackingPort.loadTracking(any())).thenReturn(List.of());

        var response = trackingService.execute(new TrackingQuery(
                null, null, null, null, null, null, null, null, null, null, null
        ));

        assertThat(response.items()).isEmpty();
        verify(loadTrackingPort).loadTracking(any());
    }

    @Test
    @DisplayName("BE-UNIT-TRACK-001 scoped tracking query returns change summary items")
    void queryTrackingReturnsItems() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadTrackingPort.loadTracking(any())).thenReturn(List.of(summary(100L, 90L, true)));

        var response = trackingService.execute(new TrackingQuery(
                null, 10L, null, TargetType.ZONE, LocalDate.now().minusDays(7), LocalDate.now(),
                AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY, null, null, null
        ));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).worsened()).isTrue();
    }

    @Test
    @DisplayName("BE-UNIT-TRACK-002 returns empty response when no tracking data exists")
    void queryTrackingReturnsEmptyItemsWhenNoDataExists() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadTrackingPort.loadTracking(any())).thenReturn(List.of());

        var response = trackingService.execute(new TrackingQuery(
                null, 10L, null, TargetType.ZONE, LocalDate.now().minusDays(7), LocalDate.now(),
                AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY, null, null, null
        ));

        assertThat(response.items()).isEmpty();
    }

    @Test
    void compareTrackingValidatesAccessAndReturnsResponse() {
        when(loadAnalysisResultPort.loadAnalysisResult(100L)).thenReturn(Optional.of(result(100L)));
        when(loadAnalysisResultPort.loadAnalysisResult(90L)).thenReturn(Optional.of(result(90L)));
        when(accessChecker.checkResultAccess(1L, 100L)).thenReturn(true);
        when(accessChecker.checkResultAccess(1L, 90L)).thenReturn(true);
        when(loadInspectionComparisonPort.loadInspectionComparison(any())).thenReturn(Optional.of(compareResponse()));

        var response = trackingService.execute(new InspectionCompareQuery(100L, 90L));

        assertThat(response.worsened()).isTrue();
        assertThat(response.defectChange().newDefectTypes()).contains(DefectType.HOTSPOT);
    }

    @Test
    void compareTrackingReturnsCurrentOnlyResponseWhenPreviousResultDoesNotExist() {
        when(loadAnalysisResultPort.loadAnalysisResult(100L)).thenReturn(Optional.of(result(100L)));
        when(accessChecker.checkResultAccess(1L, 100L)).thenReturn(true);
        when(loadInspectionComparisonPort.loadInspectionComparison(any())).thenReturn(Optional.of(new InspectionCompareResponse(
                100L,
                null,
                summary(100L, null, false),
                null,
                new AreaChangeResponse(BigDecimal.valueOf(0.20), null, null),
                new com.pvfusion.application.dto.tracking.SeverityChangeResponse(
                        BigDecimal.valueOf(0.90), null, null, false
                ),
                new DefectChangeResponse(2, 0, 2, List.of(DefectType.HOTSPOT), List.of(), List.of()),
                false,
                false,
                "no priority escalation"
        )));

        var response = trackingService.execute(new InspectionCompareQuery(100L, null));

        assertThat(response.currentResultId()).isEqualTo(100L);
        assertThat(response.previousResultId()).isNull();
    }

    @Test
    void compareTrackingFailsWhenCurrentResultMissing() {
        when(loadAnalysisResultPort.loadAnalysisResult(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trackingService.execute(new InspectionCompareQuery(100L, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void compareTrackingRejectsUserWithoutCurrentResultAccess() {
        when(loadAnalysisResultPort.loadAnalysisResult(100L)).thenReturn(Optional.of(result(100L)));
        when(accessChecker.checkResultAccess(1L, 100L)).thenReturn(false);

        assertThatThrownBy(() -> trackingService.execute(new InspectionCompareQuery(100L, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(loadInspectionComparisonPort, never()).loadInspectionComparison(any());
    }

    private InspectionCompareResponse compareResponse() {
        return new InspectionCompareResponse(
                100L,
                90L,
                summary(100L, 90L, true),
                summary(90L, null, false),
                new AreaChangeResponse(BigDecimal.valueOf(0.20), BigDecimal.valueOf(0.10), BigDecimal.valueOf(0.10)),
                new com.pvfusion.application.dto.tracking.SeverityChangeResponse(
                        BigDecimal.valueOf(0.90), BigDecimal.valueOf(0.70), BigDecimal.valueOf(0.20), true
                ),
                new DefectChangeResponse(
                        2, 1, 1,
                        List.of(DefectType.HOTSPOT),
                        List.of(),
                        List.of(DefectType.SHADING)
                ),
                true,
                true,
                "severity level increased"
        );
    }

    private TrackingSummaryResponse summary(Long currentResultId, Long previousResultId, boolean worsened) {
        return new TrackingSummaryResponse(
                30L, previousResultId != null ? 20L : null, currentResultId, previousResultId, 1L, 10L, null,
                TargetType.ZONE, AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY, 2, 1,
                BigDecimal.valueOf(0.20), previousResultId != null ? BigDecimal.valueOf(0.10) : null,
                BigDecimal.valueOf(0.90), previousResultId != null ? BigDecimal.valueOf(0.70) : null,
                ActionCandidate.CLEANING, PriorityLevel.HIGH, SeverityLevel.HIGH, previousResultId != null, worsened, OffsetDateTime.now()
        );
    }

    private AnalysisResult result(Long id) {
        return new AnalysisResult(
                id, 10L, AnalysisModelType.RGB_ONLY, "model", "1.0", "onnx", "cpu", 640,
                BigDecimal.valueOf(0.5), AnalysisResultStatus.ANOMALY, 1, BigDecimal.valueOf(0.8),
                BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.7), SeverityLevel.MEDIUM,
                ActionCandidate.CLEANING, PriorityLevel.MEDIUM, ReviewStatus.UNCHECKED,
                null, null, null, null, null, null, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now()
        );
    }
}
