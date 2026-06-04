package com.pvfusion.application.port.out.user;

import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.domain.plant.PlantMember;
import java.util.List;
import java.util.Optional;

public interface LoadPlantMemberPort {

    Optional<PlantMember> loadPlantMember(Long plantMemberId);

    List<PlantMember> loadPlantMembers(PlantMemberListQuery query);
}
