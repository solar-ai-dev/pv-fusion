package com.pvfusion.application.port.in.zone;

import com.pvfusion.application.dto.zone.CreateZoneCommand;
import com.pvfusion.application.dto.zone.ZoneResponse;

public interface CreateZoneUseCase {

    ZoneResponse execute(CreateZoneCommand command);
}
