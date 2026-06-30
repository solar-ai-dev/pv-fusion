package com.pvfusion.application.port.in.plant;

import com.pvfusion.application.dto.plant.PlantResponse;
import com.pvfusion.application.dto.plant.UpdatePlantCommand;

public interface UpdatePlantUseCase {

    PlantResponse execute(UpdatePlantCommand command);
}
