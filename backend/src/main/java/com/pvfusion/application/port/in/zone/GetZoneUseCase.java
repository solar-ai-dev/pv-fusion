package com.pvfusion.application.port.in.zone;

import com.pvfusion.application.dto.zone.GetZoneQuery;
import com.pvfusion.application.dto.zone.ZoneResponse;

public interface GetZoneUseCase {

    ZoneResponse execute(GetZoneQuery query);
}
