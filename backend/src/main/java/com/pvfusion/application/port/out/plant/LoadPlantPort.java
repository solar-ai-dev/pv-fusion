package com.pvfusion.application.port.out.plant;

import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.domain.plant.Plant;
import java.util.List;
import java.util.Optional;

public interface LoadPlantPort {

    Optional<Plant> loadPlant(Long plantId);

    List<Plant> loadPlants(PlantListQuery query);

    long countPlants(PlantListQuery query);
}
