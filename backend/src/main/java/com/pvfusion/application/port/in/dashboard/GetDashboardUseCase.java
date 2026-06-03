package com.pvfusion.application.port.in.dashboard;

import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardResponse;

public interface GetDashboardUseCase {

    DashboardResponse execute(DashboardQuery query);
}
