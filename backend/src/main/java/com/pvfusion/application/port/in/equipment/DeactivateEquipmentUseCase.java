package com.pvfusion.application.port.in.equipment;

import com.pvfusion.application.dto.equipment.DeactivateEquipmentCommand;
import com.pvfusion.application.dto.equipment.EquipmentResponse;

public interface DeactivateEquipmentUseCase {

    EquipmentResponse execute(DeactivateEquipmentCommand command);
}
