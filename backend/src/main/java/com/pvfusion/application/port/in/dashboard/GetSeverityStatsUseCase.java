package com.pvfusion.application.port.in.dashboard;

import com.pvfusion.application.dto.dashboard.SeverityStatsQuery;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;

public interface GetSeverityStatsUseCase {

    SeverityStatsResponse execute(SeverityStatsQuery query);
}
