package com.pvfusion.domain.plant;

import com.pvfusion.domain.common.ResourceStatus;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class PlantMember {

    private final Long id;
    private final Long plantId;
    private final Long userId;
    private final PlantMemberRole memberRole;
    private final ResourceStatus status;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public PlantMember(
            Long id,
            Long plantId,
            Long userId,
            PlantMemberRole memberRole,
            ResourceStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.plantId = plantId;
        this.userId = userId;
        this.memberRole = memberRole;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public PlantMember changeRole(PlantMemberRole memberRole) {
        return new PlantMember(
                id,
                plantId,
                userId,
                memberRole,
                status,
                createdAt,
                OffsetDateTime.now()
        );
    }

    public PlantMember deactivate() {
        return new PlantMember(
                id,
                plantId,
                userId,
                memberRole,
                ResourceStatus.INACTIVE,
                createdAt,
                OffsetDateTime.now()
        );
    }

    public PlantMember activate(PlantMemberRole memberRole) {
        return new PlantMember(
                id,
                plantId,
                userId,
                memberRole,
                ResourceStatus.ACTIVE,
                createdAt,
                OffsetDateTime.now()
        );
    }

    public boolean isActive() {
        return status == ResourceStatus.ACTIVE;
    }

    public boolean isInactive() {
        return status == ResourceStatus.INACTIVE;
    }

    public boolean hasManageRole() {
        return memberRole == PlantMemberRole.OWNER || memberRole == PlantMemberRole.MANAGER;
    }
}
