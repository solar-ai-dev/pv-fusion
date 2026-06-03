package com.pvfusion.domain.zone;

import com.pvfusion.domain.common.ResourceStatus;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class Zone {

    private final Long id;
    private final Long plantId;
    private final String name;
    private final String location;
    private final String description;
    private final ResourceStatus status;
    private final Long createdByUserId;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public Zone(
            Long id,
            Long plantId,
            String name,
            String location,
            String description,
            ResourceStatus status,
            Long createdByUserId,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.plantId = plantId;
        this.name = name;
        this.location = location;
        this.description = description;
        this.status = status;
        this.createdByUserId = createdByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
