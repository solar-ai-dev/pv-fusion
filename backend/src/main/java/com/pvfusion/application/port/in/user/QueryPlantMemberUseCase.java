package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.application.dto.user.PlantMemberResponse;
import java.util.List;

public interface QueryPlantMemberUseCase {

    List<PlantMemberResponse> execute(PlantMemberListQuery query);
}
