package com.pvfusion.application.port.out.plant;

import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.application.dto.user.PlantMemberResponse;
import com.pvfusion.domain.plant.PlantMember;
import java.util.List;
import java.util.Optional;

public interface PlantMemberRepositoryPort {

    List<PlantMemberResponse> findAll(PlantMemberListQuery query);

    Optional<PlantMember> findById(Long plantMemberId);

    Optional<PlantMember> findByPlantIdAndUserId(Long plantId, Long userId);

    boolean existsActiveByPlantIdAndUserId(Long plantId, Long userId);

    PlantMember save(PlantMember plantMember);
}
