package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "plant_members",
        uniqueConstraints = @UniqueConstraint(name = "uq_plant_members_plant_user", columnNames = {"plant_id", "user_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlantMemberJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plant_id", nullable = false)
    private Long plantId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false, length = 30)
    private PlantMemberRole memberRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ResourceStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static PlantMemberJpaEntity fromDomain(PlantMember plantMember) {
        PlantMemberJpaEntity entity = new PlantMemberJpaEntity();
        entity.id = plantMember.getId();
        entity.apply(plantMember);
        return entity;
    }

    public void apply(PlantMember plantMember) {
        this.plantId = plantMember.getPlantId();
        this.userId = plantMember.getUserId();
        this.memberRole = plantMember.getMemberRole();
        this.status = plantMember.getStatus();
        this.createdAt = plantMember.getCreatedAt();
        this.updatedAt = plantMember.getUpdatedAt();
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    void preUpdate() {
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
    }
}
