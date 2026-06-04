package com.pvfusion.application.dto.equipment;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.EquipmentType;
import java.time.OffsetDateTime;

public record EquipmentResponse(
        Long equipmentId,
        Long zoneId,
        Long parentEquipmentId,
        EquipmentType equipmentType,
        String name,
        String positionCode,
        ResourceStatus status,
        Long createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
