package com.pvfusion.application.dto.equipment;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.EquipmentType;

public record EquipmentSummaryResponse(
        Long equipmentId,
        Long zoneId,
        Long parentEquipmentId,
        EquipmentType equipmentType,
        String name,
        String positionCode,
        ResourceStatus status
) {
}
