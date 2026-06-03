package com.pvfusion.domain.equipment;

import com.pvfusion.domain.common.ResourceStatus;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class Equipment {

    private final Long id;
    private final Long zoneId;
    private final Long parentEquipmentId;
    private final EquipmentType equipmentType;
    private final String name;
    private final String positionCode;
    private final ResourceStatus status;
    private final Long createdByUserId;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public Equipment(
            Long id,
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
        this.id = id;
        this.zoneId = zoneId;
        this.parentEquipmentId = parentEquipmentId;
        this.equipmentType = equipmentType;
        this.name = name;
        this.positionCode = positionCode;
        this.status = status;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
