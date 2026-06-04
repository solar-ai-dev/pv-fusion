package com.pvfusion.application.port.out.dashboard;

import com.pvfusion.application.dto.dashboard.AdminDashboardQuery;
import com.pvfusion.application.dto.dashboard.AdminDashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardQuery;
import com.pvfusion.application.dto.dashboard.DashboardResponse;

public interface LoadDashboardPort {

    DashboardResponse loadDashboard(DashboardQuery query);

    AdminDashboardResponse loadAdminDashboard(AdminDashboardQuery query);
}
