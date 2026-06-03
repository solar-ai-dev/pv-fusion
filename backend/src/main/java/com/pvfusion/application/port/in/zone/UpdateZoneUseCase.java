package com.pvfusion.application.port.in.zone;

import com.pvfusion.application.dto.zone.UpdateZoneCommand;
import com.pvfusion.application.dto.zone.ZoneResponse;

public interface UpdateZoneUseCase {

    ZoneResponse execute(UpdateZoneCommand command);
}
