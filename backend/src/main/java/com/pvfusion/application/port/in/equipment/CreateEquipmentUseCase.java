package com.pvfusion.application.port.in.equipment;

import com.pvfusion.application.dto.equipment.CreateEquipmentCommand;
import com.pvfusion.application.dto.equipment.EquipmentResponse;

public interface CreateEquipmentUseCase {

    EquipmentResponse execute(CreateEquipmentCommand command);
}
