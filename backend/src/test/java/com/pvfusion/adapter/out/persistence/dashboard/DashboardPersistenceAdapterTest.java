package com.pvfusion.adapter.out.persistence.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class DashboardPersistenceAdapterTest {

    @Mock
    private DashboardJpaRepository dashboardJpaRepository;

    private DashboardPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new DashboardPersistenceAdapter(dashboardJpaRepository);
    }

    @Test
    void loadDashboardMapsSummaryAndRecentResults() {
        when(dashboardJpaRepository.loadDashboardSummary(null, 10L, null, null)).thenReturn(summaryProjection());
        when(dashboardJpaRepository.loadRecentResults(null, 10L, null, null, PageRequest.of(0, 5)))
                .thenReturn(List.of(recentProjection()));

        var response = adapter.loadDashboard(new DashboardQuery(1L, null, 10L, null, null));

        assertThat(response.summary().totalAnalysisJobCount()).isEqualTo(7);
        assertThat(response.recentResults()).hasSize(1);
    }

    @Test
    void loadActionAndSeverityStatsMapEnums() {
        when(dashboardJpaRepository.loadActionStats(null, 10L, null, null)).thenReturn(List.of(enumProjection("CLEANING", 2)));
        when(dashboardJpaRepository.loadSeverityStats(null, 10L, null, null)).thenReturn(List.of(enumProjection("HIGH", 3)));

        assertThat(adapter.loadActionStats(new ActionStatsQuery(1L, null, 10L, null, null)).items().get(0).count()).isEqualTo(2);
        assertThat(adapter.loadSeverityStats(new SeverityStatsQuery(1L, null, 10L, null, null)).items().get(0).count()).isEqualTo(3);
    }

    @Test
    void loadDashboardTrendAggregatesToWeekly() {
        when(dashboardJpaRepository.loadInspectionTrends(null, 10L, null, null)).thenReturn(List.of(
                trendProjection(LocalDate.of(2026, 6, 1), 2),
                trendProjection(LocalDate.of(2026, 6, 3), 1)
        ));
        when(dashboardJpaRepository.loadAnomalyTrends(null, 10L, null, null)).thenReturn(List.of(
                trendProjection(LocalDate.of(2026, 6, 2), 1)
        ));

        var response = adapter.loadDashboardTrend(new DashboardTrendQuery(1L, null, 10L, null, null, "WEEKLY"));

        assertThat(response.points()).hasSize(1);
        assertThat(response.points().get(0).inspectionCount()).isEqualTo(3);
        assertThat(response.points().get(0).anomalyCount()).isEqualTo(1);
    }

    private DashboardSummaryProjection summaryProjection() {
        return new DashboardSummaryProjection() {
            public long getTotalPlantCount() { return 1; }
            public long getTotalZoneCount() { return 1; }
            public long getTotalInspectionCount() { return 3; }
            public long getInProgressInspectionCount() { return 1; }
            public long getCompletedInspectionCount() { return 2; }
            public long getTotalImageCount() { return 10; }
            public long getTotalImagePairCount() { return 4; }
            public long getTotalAnalysisJobCount() { return 7; }
            public long getQueuedJobCount() { return 1; }
            public long getRunningJobCount() { return 1; }
            public long getSucceededJobCount() { return 4; }
            public long getFailedJobCount() { return 1; }
            public long getTotalAnalysisResultCount() { return 6; }
            public long getNormalResultCount() { return 2; }
            public long getAnomalyResultCount() { return 3; }
            public long getLowConfidenceResultCount() { return 1; }
            public long getAnomalyZoneCount() { return 2; }
            public long getHighPriorityCount() { return 3; }
            public long getPendingReviewCount() { return 2; }
        };
    }

    private RecentResultProjection recentProjection() {
        return new RecentResultProjection() {
            public Long getResultId() { return 100L; }
            public Long getInspectionId() { return 30L; }
            public Long getPlantId() { return 1L; }
            public Long getZoneId() { return 10L; }
            public Long getEquipmentId() { return null; }
            public String getPlantName() { return "plant"; }
            public String getZoneName() { return "zone"; }
            public String getInspectionName() { return "inspection"; }
            public String getActionCandidate() { return "CLEANING"; }
            public String getSeverityLevel() { return "HIGH"; }
            public String getPriorityLevel() { return "HIGH"; }
            public OffsetDateTime getAnalyzedAt() { return OffsetDateTime.now(); }
        };
    }

    private EnumCountProjection enumProjection(String category, long count) {
        return new EnumCountProjection() {
            public String getCategory() { return category; }
            public long getCount() { return count; }
        };
    }

    private TrendCountProjection trendProjection(LocalDate date, long count) {
        return new TrendCountProjection() {
            public LocalDate getTrendDate() { return date; }
            public long getCount() { return count; }
        };
    }
}
