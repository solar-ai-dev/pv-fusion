package com.pvfusion.application.port.in.dashboard;

import com.pvfusion.application.dto.dashboard.AdminDashboardQuery;
import com.pvfusion.application.dto.dashboard.AdminDashboardResponse;

public interface GetAdminDashboardUseCase {

    AdminDashboardResponse execute(AdminDashboardQuery query);
}
