package com.pvfusion.adapter.out.persistence.dashboard;

import com.pvfusion.application.dto.dashboard.ActionStatItemResponse;
import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;
import com.pvfusion.application.dto.dashboard.AdminDashboardQuery;
import com.pvfusion.application.dto.dashboard.AdminDashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardSummaryResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendPointResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;
import com.pvfusion.application.dto.dashboard.RecentInspectionResultResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatItemResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;
import com.pvfusion.application.port.out.dashboard.LoadDashboardPort;
import com.pvfusion.application.port.out.dashboard.LoadDashboardStatsPort;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DashboardPersistenceAdapter implements LoadDashboardPort, LoadDashboardStatsPort {

    private static final int DEFAULT_RECENT_LIMIT = 5;

    private final DashboardJpaRepository dashboardJpaRepository;

    @Override
    public DashboardResponse loadDashboard(DashboardQuery query) {
        DashboardSummaryProjection projection = dashboardJpaRepository.loadDashboardSummary(
                query.plantId(),
                query.zoneId(),
                query.from(),
                query.to()
        );
        return new DashboardResponse(
                toSummary(projection, 0L, 0L),
                dashboardJpaRepository.loadRecentResults(
                                query.plantId(),
                                query.zoneId(),
                                query.from(),
                                query.to(),
                                PageRequest.of(0, DEFAULT_RECENT_LIMIT)
                        ).stream()
                        .map(this::toRecentResponse)
                        .toList(),
                List.of()
        );
    }

    @Override
    public AdminDashboardResponse loadAdminDashboard(AdminDashboardQuery query) {
        DashboardSummaryProjection projection = dashboardJpaRepository.loadDashboardSummary(null, null, null, null);
        DashboardSummaryResponse summary = toSummary(projection, 0L, 0L);
        return new AdminDashboardResponse(
                dashboardJpaRepository.countUsers(),
                summary.totalImageCount(),
                summary.totalAnalysisJobCount(),
                summary.totalAnalysisResultCount(),
                summary
        );
    }

    @Override
    public ActionStatsResponse loadActionStats(ActionStatsQuery query) {
        List<ActionStatItemResponse> items = dashboardJpaRepository.loadActionStats(
                        query.plantId(),
                        query.zoneId(),
                        query.from(),
                        query.to()
                ).stream()
                .map(row -> new ActionStatItemResponse(
                        ActionCandidate.valueOf(row.getCategory()),
                        row.getCount()
                ))
                .toList();
        return new ActionStatsResponse(items);
    }

    @Override
    public SeverityStatsResponse loadSeverityStats(SeverityStatsQuery query) {
        List<SeverityStatItemResponse> items = dashboardJpaRepository.loadSeverityStats(
                        query.plantId(),
                        query.zoneId(),
                        query.from(),
                        query.to()
                ).stream()
                .map(row -> new SeverityStatItemResponse(
                        SeverityLevel.valueOf(row.getCategory()),
                        row.getCount()
                ))
                .toList();
        return new SeverityStatsResponse(items);
    }

    @Override
    public DashboardTrendResponse loadDashboardTrend(DashboardTrendQuery query) {
        List<TrendCountProjection> inspectionRows = dashboardJpaRepository.loadInspectionTrends(
                query.plantId(),
                query.zoneId(),
                query.from(),
                query.to()
        );
        List<TrendCountProjection> anomalyRows = dashboardJpaRepository.loadAnomalyTrends(
                query.plantId(),
                query.zoneId(),
                query.from(),
                query.to()
        );

        Map<LocalDate, long[]> merged = new LinkedHashMap<>();
        for (TrendCountProjection row : inspectionRows) {
            merged.computeIfAbsent(normalizeDate(row.getTrendDate(), query.interval()), ignored -> new long[2])[0] += row.getCount();
        }
        for (TrendCountProjection row : anomalyRows) {
            merged.computeIfAbsent(normalizeDate(row.getTrendDate(), query.interval()), ignored -> new long[2])[1] += row.getCount();
        }

        List<DashboardTrendPointResponse> points = new ArrayList<>();
        for (Map.Entry<LocalDate, long[]> entry : merged.entrySet()) {
            points.add(new DashboardTrendPointResponse(
                    entry.getKey(),
                    entry.getValue()[0],
                    entry.getValue()[1]
            ));
        }

        return new DashboardTrendResponse(query.interval(), points);
    }

    private DashboardSummaryResponse toSummary(DashboardSummaryProjection projection, long worsenedCount, long repeatedAnomalyCount) {
        return new DashboardSummaryResponse(
                projection.getTotalPlantCount(),
                projection.getTotalZoneCount(),
                projection.getTotalInspectionCount(),
                projection.getInProgressInspectionCount(),
                projection.getCompletedInspectionCount(),
                projection.getTotalImageCount(),
                projection.getTotalImagePairCount(),
                projection.getTotalAnalysisJobCount(),
                projection.getQueuedJobCount(),
                projection.getRunningJobCount(),
                projection.getSucceededJobCount(),
                projection.getFailedJobCount(),
                projection.getTotalAnalysisResultCount(),
                projection.getNormalResultCount(),
                projection.getAnomalyResultCount(),
                projection.getLowConfidenceResultCount(),
                projection.getAnomalyZoneCount(),
                projection.getHighPriorityCount(),
                projection.getPendingReviewCount(),
                worsenedCount,
                repeatedAnomalyCount
        );
    }

    public DashboardSummaryResponse enrichSummary(
            DashboardSummaryResponse summary,
            long worsenedCount,
            long repeatedAnomalyCount
    ) {
        return new DashboardSummaryResponse(
                summary.totalPlantCount(),
                summary.totalZoneCount(),
                summary.totalInspectionCount(),
                summary.inProgressInspectionCount(),
                summary.completedInspectionCount(),
                summary.totalImageCount(),
                summary.totalImagePairCount(),
                summary.totalAnalysisJobCount(),
                summary.queuedJobCount(),
                summary.runningJobCount(),
                summary.succeededJobCount(),
                summary.failedJobCount(),
                summary.totalAnalysisResultCount(),
                summary.normalResultCount(),
                summary.anomalyResultCount(),
                summary.lowConfidenceResultCount(),
                summary.anomalyZoneCount(),
                summary.highPriorityCount(),
                summary.pendingReviewCount(),
                worsenedCount,
                repeatedAnomalyCount
        );
    }

    private RecentInspectionResultResponse toRecentResponse(RecentResultProjection projection) {
        return new RecentInspectionResultResponse(
                projection.getResultId(),
                projection.getInspectionId(),
                projection.getPlantId(),
                projection.getZoneId(),
                projection.getEquipmentId(),
                projection.getPlantName(),
                projection.getZoneName(),
                projection.getInspectionName(),
                ActionCandidate.valueOf(projection.getActionCandidate()),
                SeverityLevel.valueOf(projection.getSeverityLevel()),
                PriorityLevel.valueOf(projection.getPriorityLevel()),
                toOffsetDateTime(projection.getAnalyzedAt())
        );
    }

    private OffsetDateTime toOffsetDateTime(Instant value) {
        return value != null ? OffsetDateTime.ofInstant(value, ZoneOffset.UTC) : null;
    }

    private LocalDate normalizeDate(LocalDate date, String interval) {
        return switch (interval) {
            case "WEEKLY" -> date.with(java.time.DayOfWeek.MONDAY);
            case "MONTHLY" -> date.with(TemporalAdjusters.firstDayOfMonth());
            default -> date;
        };
    }
}
