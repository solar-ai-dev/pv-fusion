package com.pvfusion.application.port.out.dashboard;

import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;

public interface LoadDashboardStatsPort {

    ActionStatsResponse loadActionStats(ActionStatsQuery query);

    SeverityStatsResponse loadSeverityStats(SeverityStatsQuery query);

    DashboardTrendResponse loadDashboardTrend(DashboardTrendQuery query);
}
