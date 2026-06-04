package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.GrantPlantAccessCommand;
import com.pvfusion.application.dto.user.PlantMemberResponse;

public interface GrantPlantAccessUseCase {

    PlantMemberResponse execute(GrantPlantAccessCommand command);
}
