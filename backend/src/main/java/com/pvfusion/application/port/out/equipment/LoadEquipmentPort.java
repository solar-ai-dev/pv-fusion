package com.pvfusion.application.port.out.equipment;

import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.domain.equipment.Equipment;
import java.util.List;
import java.util.Optional;

public interface LoadEquipmentPort {

    Optional<Equipment> loadEquipment(Long equipmentId);

    List<Equipment> loadEquipments(EquipmentListQuery query);
}
