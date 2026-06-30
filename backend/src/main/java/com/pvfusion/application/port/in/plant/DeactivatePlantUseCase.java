package com.pvfusion.application.port.in.plant;

import com.pvfusion.application.dto.plant.DeactivatePlantCommand;
import com.pvfusion.application.dto.plant.PlantResponse;

public interface DeactivatePlantUseCase {

    PlantResponse execute(DeactivatePlantCommand command);
}
