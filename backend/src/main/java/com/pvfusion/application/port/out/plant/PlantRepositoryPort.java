package com.pvfusion.application.port.out.plant;

import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.global.response.PageResponse;
import java.util.Optional;

public interface PlantRepositoryPort {

    PageResponse<PlantSummaryResponse> findAll(PlantListQuery query);

    Optional<Plant> findById(Long plantId);

    Plant save(Plant plant);
}
