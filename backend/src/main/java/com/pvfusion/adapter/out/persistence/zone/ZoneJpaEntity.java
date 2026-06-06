package com.pvfusion.adapter.out.persistence.zone;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.zone.Zone;
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
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "zones")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ZoneJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plant_id", nullable = false)
    private Long plantId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ResourceStatus status;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static ZoneJpaEntity fromDomain(Zone zone) {
        ZoneJpaEntity entity = new ZoneJpaEntity();
        entity.id = zone.getId();
        entity.apply(zone);
        return entity;
    }

    public void apply(Zone zone) {
        this.plantId = zone.getPlantId();
        this.name = zone.getName();
        this.location = zone.getLocation();
        this.description = zone.getDescription();
        this.status = zone.getStatus();
        this.createdByUserId = zone.getCreatedByUserId();
        this.createdAt = zone.getCreatedAt();
        this.updatedAt = zone.getUpdatedAt();
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
