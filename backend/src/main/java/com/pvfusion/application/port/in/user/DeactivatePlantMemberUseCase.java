package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.DeactivatePlantMemberCommand;
import com.pvfusion.application.dto.user.PlantMemberResponse;

public interface DeactivatePlantMemberUseCase {

    PlantMemberResponse execute(DeactivatePlantMemberCommand command);
}
