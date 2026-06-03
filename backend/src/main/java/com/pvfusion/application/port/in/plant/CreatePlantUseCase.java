package com.pvfusion.application.port.in.plant;

import com.pvfusion.application.dto.plant.CreatePlantCommand;
import com.pvfusion.application.dto.plant.PlantResponse;

public interface CreatePlantUseCase {

    PlantResponse execute(CreatePlantCommand command);
}
