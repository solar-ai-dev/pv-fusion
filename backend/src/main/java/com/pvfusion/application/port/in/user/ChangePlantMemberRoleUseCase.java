package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.ChangePlantMemberRoleCommand;
import com.pvfusion.application.dto.user.PlantMemberResponse;

public interface ChangePlantMemberRoleUseCase {

    PlantMemberResponse execute(ChangePlantMemberRoleCommand command);
}
