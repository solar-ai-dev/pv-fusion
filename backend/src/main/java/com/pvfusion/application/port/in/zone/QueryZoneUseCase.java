package com.pvfusion.application.port.in.zone;

import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.application.dto.zone.ZoneSummaryResponse;
import java.util.List;

public interface QueryZoneUseCase {

    List<ZoneSummaryResponse> execute(ZoneListQuery query);
}
