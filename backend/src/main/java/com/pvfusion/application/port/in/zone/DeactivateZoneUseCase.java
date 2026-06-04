package com.pvfusion.application.port.in.zone;

import com.pvfusion.application.dto.zone.DeactivateZoneCommand;
import com.pvfusion.application.dto.zone.ZoneResponse;

public interface DeactivateZoneUseCase {

    ZoneResponse execute(DeactivateZoneCommand command);
}
