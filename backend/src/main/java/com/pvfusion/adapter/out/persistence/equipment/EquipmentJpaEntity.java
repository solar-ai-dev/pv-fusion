package com.pvfusion.adapter.out.persistence.equipment;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.equipment.EquipmentType;
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
@Table(name = "equipments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EquipmentJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "zone_id", nullable = false)
    private Long zoneId;

    @Column(name = "parent_equipment_id")
    private Long parentEquipmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "equipment_type", nullable = false, length = 30)
    private EquipmentType equipmentType;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "position_code", length = 100)
    private String positionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ResourceStatus status;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static EquipmentJpaEntity fromDomain(Equipment equipment) {
        EquipmentJpaEntity entity = new EquipmentJpaEntity();
        entity.id = equipment.getId();
        entity.apply(equipment);
        return entity;
    }

    public void apply(Equipment equipment) {
        this.zoneId = equipment.getZoneId();
        this.parentEquipmentId = equipment.getParentEquipmentId();
        this.equipmentType = equipment.getEquipmentType();
        this.name = equipment.getName();
        this.positionCode = equipment.getPositionCode();
        this.status = equipment.getStatus();
        this.createdByUserId = equipment.getCreatedByUserId();
        this.createdAt = equipment.getCreatedAt();
        this.updatedAt = equipment.getUpdatedAt();
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
