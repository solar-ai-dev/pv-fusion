package com.pvfusion.adapter.in.web.dashboard;

import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;
import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;
import com.pvfusion.application.port.in.dashboard.GetActionStatsUseCase;
import com.pvfusion.application.port.in.dashboard.GetDashboardTrendUseCase;
import com.pvfusion.application.port.in.dashboard.GetDashboardUseCase;
import com.pvfusion.application.port.in.dashboard.GetSeverityStatsUseCase;
import com.pvfusion.global.response.ApiResponse;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final GetDashboardUseCase getDashboardUseCase;
    private final GetActionStatsUseCase getActionStatsUseCase;
    private final GetSeverityStatsUseCase getSeverityStatsUseCase;
    private final GetDashboardTrendUseCase getDashboardTrendUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        DashboardResponse response = getDashboardUseCase.execute(new DashboardQuery(
                plantId,
                zoneId,
                from,
                to
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/action-stats")
    public ResponseEntity<ApiResponse<ActionStatsResponse>> getActionStats(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        ActionStatsResponse response = getActionStatsUseCase.execute(new ActionStatsQuery(
                plantId,
                zoneId,
                from,
                to
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/severity-stats")
    public ResponseEntity<ApiResponse<SeverityStatsResponse>> getSeverityStats(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        SeverityStatsResponse response = getSeverityStatsUseCase.execute(new SeverityStatsQuery(
                plantId,
                zoneId,
                from,
                to
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<DashboardTrendResponse>> getDashboardTrends(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String interval
    ) {
        DashboardTrendResponse response = getDashboardTrendUseCase.execute(new DashboardTrendQuery(
                plantId,
                zoneId,
                from,
                to,
                interval
        ));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
