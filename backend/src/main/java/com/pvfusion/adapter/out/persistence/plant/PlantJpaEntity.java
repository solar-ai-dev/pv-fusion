package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.Plant;
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
@Table(name = "plants")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlantJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    public static PlantJpaEntity fromDomain(Plant plant) {
        PlantJpaEntity entity = new PlantJpaEntity();
        entity.id = plant.getId();
        entity.apply(plant);
        return entity;
    }

    public void apply(Plant plant) {
        this.name = plant.getName();
        this.location = plant.getLocation();
        this.description = plant.getDescription();
        this.status = plant.getStatus();
        this.createdByUserId = plant.getCreatedByUserId();
        this.createdAt = plant.getCreatedAt();
        this.updatedAt = plant.getUpdatedAt();
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
