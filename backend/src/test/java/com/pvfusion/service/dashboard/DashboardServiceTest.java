package com.pvfusion.service.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;
import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardSummaryResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;
import com.pvfusion.application.dto.dashboard.RecentInspectionResultResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;
import com.pvfusion.application.dto.tracking.TrackingSummaryResponse;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.dashboard.LoadDashboardPort;
import com.pvfusion.application.port.out.dashboard.LoadDashboardStatsPort;
import com.pvfusion.application.port.out.tracking.LoadTrackingPort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private LoadDashboardPort loadDashboardPort;
    @Mock
    private LoadDashboardStatsPort loadDashboardStatsPort;
    @Mock
    private LoadTrackingPort loadTrackingPort;
    @Mock
    private AccessChecker accessChecker;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(
                loadDashboardPort,
                loadDashboardStatsPort,
                loadTrackingPort,
                accessChecker
        );
    }

    @Test
    void getDashboardRequiresScopedFilterForNonAdmin() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);

        assertThatThrownBy(() -> dashboardService.execute(new DashboardQuery(1L, null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void getDashboardEnrichesSummaryWithTrackingCounts() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadDashboardPort.loadDashboard(any())).thenReturn(baseResponse());
        when(loadTrackingPort.loadTracking(any())).thenReturn(List.of(
                trackingItem(true, true, 100L),
                trackingItem(true, false, 101L),
                trackingItem(false, true, 102L)
        ));

        DashboardResponse response = dashboardService.execute(new DashboardQuery(
                1L, null, 10L, LocalDate.now().minusDays(7), LocalDate.now()
        ));

        assertThat(response.summary().worsenedCount()).isEqualTo(2);
        assertThat(response.summary().repeatedAnomalyCount()).isEqualTo(2);
        assertThat(response.priorityTargets()).hasSize(3);
    }

    @Test
    void getDashboardTrendNormalizesInterval() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadDashboardStatsPort.loadDashboardTrend(any())).thenReturn(new DashboardTrendResponse("WEEKLY", List.of()));

        DashboardTrendResponse response = dashboardService.execute(new DashboardTrendQuery(
                1L, null, 10L, null, null, "week"
        ));

        assertThat(response.period()).isEqualTo("WEEKLY");
    }

    @Test
    void getDashboardTrendRejectsUnsupportedInterval() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> dashboardService.execute(new DashboardTrendQuery(
                1L, null, 10L, null, null, "year"
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void delegatesActionAndSeverityStats() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadDashboardStatsPort.loadActionStats(any())).thenReturn(new ActionStatsResponse(List.of()));
        when(loadDashboardStatsPort.loadSeverityStats(any())).thenReturn(new SeverityStatsResponse(List.of()));

        assertThat(dashboardService.execute(new ActionStatsQuery(1L, null, 10L, null, null)).items()).isEmpty();
        assertThat(dashboardService.execute(new SeverityStatsQuery(1L, null, 10L, null, null)).items()).isEmpty();
    }

    private DashboardResponse baseResponse() {
        return new DashboardResponse(
                new DashboardSummaryResponse(
                        1, 1, 3, 1, 2, 10, 4, 7, 1, 1, 4, 1, 6, 2, 3, 1, 2, 3, 2, 0, 0
                ),
                List.of(new RecentInspectionResultResponse(
                        100L, 30L, 1L, 10L, null, "plant", "zone", "inspection",
                        ActionCandidate.CLEANING, SeverityLevel.HIGH, PriorityLevel.HIGH, OffsetDateTime.now()
                )),
                List.of()
        );
    }

    private TrackingSummaryResponse trackingItem(boolean worsened, boolean repeated, Long resultId) {
        return new TrackingSummaryResponse(
                30L, 20L, resultId, 90L, 1L, 10L, null, TargetType.ZONE,
                AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY, 2, repeated ? 1 : 0,
                BigDecimal.valueOf(0.2), BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.7),
                ActionCandidate.CLEANING, PriorityLevel.HIGH, SeverityLevel.HIGH, repeated, worsened, OffsetDateTime.now()
        );
    }
}
