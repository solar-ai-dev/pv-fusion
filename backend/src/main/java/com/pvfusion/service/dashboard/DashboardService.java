package com.pvfusion.service.dashboard;

import com.pvfusion.adapter.out.persistence.dashboard.DashboardPersistenceAdapter;
import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;
import com.pvfusion.application.dto.dashboard.AdminDashboardQuery;
import com.pvfusion.application.dto.dashboard.AdminDashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardSummaryResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;
import com.pvfusion.application.dto.dashboard.PriorityTargetResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.TrackingSummaryResponse;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.dashboard.GetActionStatsUseCase;
import com.pvfusion.application.port.in.dashboard.GetAdminDashboardUseCase;
import com.pvfusion.application.port.in.dashboard.GetDashboardTrendUseCase;
import com.pvfusion.application.port.in.dashboard.GetDashboardUseCase;
import com.pvfusion.application.port.in.dashboard.GetSeverityStatsUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.dashboard.LoadDashboardPort;
import com.pvfusion.application.port.out.dashboard.LoadDashboardStatsPort;
import com.pvfusion.application.port.out.tracking.LoadTrackingPort;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.UnauthorizedException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService implements
        GetDashboardUseCase,
        GetActionStatsUseCase,
        GetSeverityStatsUseCase,
        GetDashboardTrendUseCase,
        GetAdminDashboardUseCase {

    private static final List<String> ALLOWED_INTERVALS = List.of("DAILY", "WEEKLY", "MONTHLY", "DAY", "WEEK", "MONTH");
    private static final int PRIORITY_TARGET_LIMIT = 5;

    private final LoadDashboardPort loadDashboardPort;
    private final LoadDashboardStatsPort loadDashboardStatsPort;
    private final LoadTrackingPort loadTrackingPort;
    private final AccessChecker accessChecker;
    private final CurrentUserPort currentUserPort;

    @Override
    public DashboardResponse execute(DashboardQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateDateRange(query.from(), query.to());
        validateScope(currentUserId, query.plantId(), query.zoneId());

        DashboardResponse base = loadDashboardPort.loadDashboard(query);
        List<TrackingSummaryResponse> trackingItems = loadTrackingPort.loadTracking(toTrackingQuery(query));

        long worsenedCount = trackingItems.stream().filter(TrackingSummaryResponse::worsened).count();
        long repeatedAnomalyCount = trackingItems.stream().filter(TrackingSummaryResponse::repeated).count();
        DashboardSummaryResponse enrichedSummary = enrichSummary(base.summary(), worsenedCount, repeatedAnomalyCount);

        List<PriorityTargetResponse> priorityTargets = trackingItems.stream()
                .filter(item -> item.worsened() || item.repeated())
                .sorted(Comparator
                        .comparing(TrackingSummaryResponse::worsened).reversed()
                        .thenComparing(TrackingSummaryResponse::repeated).reversed()
                        .thenComparing(TrackingSummaryResponse::priorityLevel, Comparator.nullsLast(Comparator.naturalOrder())).reversed()
                        .thenComparing(TrackingSummaryResponse::severityLevel, Comparator.nullsLast(Comparator.naturalOrder())).reversed()
                        .thenComparing(TrackingSummaryResponse::analyzedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(PRIORITY_TARGET_LIMIT)
                .map(this::toPriorityTarget)
                .toList();

        return new DashboardResponse(enrichedSummary, base.recentResults(), priorityTargets);
    }

    @Override
    public ActionStatsResponse execute(ActionStatsQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateDateRange(query.from(), query.to());
        validateScope(currentUserId, query.plantId(), query.zoneId());
        return loadDashboardStatsPort.loadActionStats(query);
    }

    @Override
    public SeverityStatsResponse execute(SeverityStatsQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateDateRange(query.from(), query.to());
        validateScope(currentUserId, query.plantId(), query.zoneId());
        return loadDashboardStatsPort.loadSeverityStats(query);
    }

    @Override
    public DashboardTrendResponse execute(DashboardTrendQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateDateRange(query.from(), query.to());
        validateScope(currentUserId, query.plantId(), query.zoneId());
        String normalizedInterval = normalizeInterval(query.interval());
        return loadDashboardStatsPort.loadDashboardTrend(new DashboardTrendQuery(
                null,
                query.plantId(),
                query.zoneId(),
                query.from(),
                query.to(),
                normalizedInterval
        ));
    }

    @Override
    public AdminDashboardResponse execute(AdminDashboardQuery query) {
        Long currentUserId = requireCurrentUserId();
        if (!accessChecker.isAdmin(currentUserId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return loadDashboardPort.loadAdminDashboard(query);
    }

    private DashboardSummaryResponse enrichSummary(
            DashboardSummaryResponse summary,
            long worsenedCount,
            long repeatedAnomalyCount
    ) {
        if (loadDashboardPort instanceof DashboardPersistenceAdapter adapter) {
            return adapter.enrichSummary(summary, worsenedCount, repeatedAnomalyCount);
        }
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

    private PriorityTargetResponse toPriorityTarget(TrackingSummaryResponse item) {
        String priorityReason;
        if (item.worsened() && item.repeated()) {
            priorityReason = "worsened and repeated anomaly";
        } else if (item.worsened()) {
            priorityReason = "worsened tracking result";
        } else if (item.repeated()) {
            priorityReason = "repeated anomaly";
        } else {
            priorityReason = "tracked anomaly";
        }
        return new PriorityTargetResponse(
                item.plantId(),
                item.zoneId(),
                item.equipmentId(),
                item.targetType(),
                item.currentResultId(),
                item.actionCandidate(),
                item.severityLevel(),
                item.priorityLevel(),
                priorityReason
        );
    }

    private TrackingQuery toTrackingQuery(DashboardQuery query) {
        return new TrackingQuery(
                null,
                query.plantId(),
                query.zoneId(),
                null,
                null,
                query.from(),
                query.to(),
                null,
                null,
                null,
                null,
                null
        );
    }

    private void validateScope(Long actorUserId, Long plantId, Long zoneId) {
        boolean admin = accessChecker.isAdmin(actorUserId);
        if (!admin && plantId == null && zoneId == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Non-admin dashboard queries require scoped filters.");
        }
        if (plantId != null) {
            ensureAllowed(accessChecker.checkPlantAccess(actorUserId, plantId));
        }
        if (zoneId != null) {
            ensureAllowed(accessChecker.checkZoneAccess(actorUserId, zoneId));
        }
    }

    private String normalizeInterval(String interval) {
        if (interval == null || interval.isBlank()) {
            return "DAILY";
        }
        String upper = interval.trim().toUpperCase();
        if (!ALLOWED_INTERVALS.contains(upper)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Unsupported interval: " + interval);
        }
        return switch (upper) {
            case "DAY" -> "DAILY";
            case "WEEK" -> "WEEKLY";
            case "MONTH" -> "MONTHLY";
            default -> upper;
        };
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private Long requireCurrentUserId() {
        return currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "from must be before or equal to to.");
        }
    }
}
