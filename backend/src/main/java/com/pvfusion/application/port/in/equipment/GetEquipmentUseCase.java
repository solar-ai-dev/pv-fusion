package com.pvfusion.application.port.in.equipment;

import com.pvfusion.application.dto.equipment.EquipmentResponse;
import com.pvfusion.application.dto.equipment.GetEquipmentQuery;

public interface GetEquipmentUseCase {

    EquipmentResponse execute(GetEquipmentQuery query);
}
