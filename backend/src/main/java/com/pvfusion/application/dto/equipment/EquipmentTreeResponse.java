package com.pvfusion.application.dto.equipment;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.EquipmentType;
import java.util.List;

public record EquipmentTreeResponse(
        Long equipmentId,
        Long zoneId,
        Long parentEquipmentId,
        EquipmentType equipmentType,
        String name,
        String positionCode,
        ResourceStatus status,
        List<EquipmentTreeResponse> children
) {
}
