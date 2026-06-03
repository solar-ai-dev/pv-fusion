package com.pvfusion.application.port.in.dashboard;

import com.pvfusion.application.dto.dashboard.ActionStatsQuery;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;

public interface GetActionStatsUseCase {

    ActionStatsResponse execute(ActionStatsQuery query);
}
