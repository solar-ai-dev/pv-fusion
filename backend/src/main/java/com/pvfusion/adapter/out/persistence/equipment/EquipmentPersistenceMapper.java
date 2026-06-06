package com.pvfusion.adapter.out.persistence.equipment;

import com.pvfusion.domain.equipment.Equipment;
import org.springframework.stereotype.Component;

@Component
public class EquipmentPersistenceMapper {

    public Equipment toDomain(EquipmentJpaEntity entity) {
        return new Equipment(
                entity.getId(),
                entity.getZoneId(),
                entity.getParentEquipmentId(),
                entity.getEquipmentType(),
                entity.getName(),
                entity.getPositionCode(),
                entity.getStatus(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public EquipmentJpaEntity toEntity(Equipment equipment) {
        return EquipmentJpaEntity.fromDomain(equipment);
    }

    public EquipmentJpaEntity updateEntity(Equipment equipment, EquipmentJpaEntity entity) {
        entity.apply(equipment);
        return entity;
    }
}
