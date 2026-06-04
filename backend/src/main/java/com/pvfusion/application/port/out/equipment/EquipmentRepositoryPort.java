package com.pvfusion.application.port.out.equipment;

import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import com.pvfusion.domain.equipment.Equipment;
import java.util.List;
import java.util.Optional;

public interface EquipmentRepositoryPort {

    List<EquipmentTreeResponse> findAll(EquipmentListQuery query);

    Optional<Equipment> findById(Long equipmentId);

    List<Equipment> findByZoneId(Long zoneId);

    Equipment save(Equipment equipment);
}
