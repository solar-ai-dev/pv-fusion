package com.pvfusion.application.port.in.dashboard;

import com.pvfusion.application.dto.dashboard.DashboardTrendQuery;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;

public interface GetDashboardTrendUseCase {

    DashboardTrendResponse execute(DashboardTrendQuery query);
}
