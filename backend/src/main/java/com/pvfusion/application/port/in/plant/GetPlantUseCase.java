package com.pvfusion.application.port.in.plant;

import com.pvfusion.application.dto.plant.GetPlantQuery;
import com.pvfusion.application.dto.plant.PlantResponse;

public interface GetPlantUseCase {

    PlantResponse execute(GetPlantQuery query);
}
