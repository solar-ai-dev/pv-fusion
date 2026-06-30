package com.pvfusion.application.dto.plant;

import com.pvfusion.domain.common.ResourceStatus;

public record PlantListQuery(
        Long actorUserId,
        String keyword,
        ResourceStatus status,
        int page,
        int size
) {
    public PlantListQuery(
            String keyword,
            ResourceStatus status,
            int page,
            int size
    ) {
        this(null, keyword, status, page, size);
    }
}
