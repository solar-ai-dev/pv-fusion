package com.pvfusion.application.port.in.equipment;

import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import java.util.List;

public interface QueryEquipmentUseCase {

    List<EquipmentTreeResponse> execute(EquipmentListQuery query);
}
