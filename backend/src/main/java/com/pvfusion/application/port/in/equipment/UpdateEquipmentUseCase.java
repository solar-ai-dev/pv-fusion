package com.pvfusion.application.port.in.equipment;

import com.pvfusion.application.dto.equipment.EquipmentResponse;
import com.pvfusion.application.dto.equipment.UpdateEquipmentCommand;

public interface UpdateEquipmentUseCase {

    EquipmentResponse execute(UpdateEquipmentCommand command);
}
