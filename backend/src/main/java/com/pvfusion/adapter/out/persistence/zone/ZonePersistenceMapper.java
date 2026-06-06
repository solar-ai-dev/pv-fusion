package com.pvfusion.adapter.out.persistence.zone;

import com.pvfusion.domain.zone.Zone;
import org.springframework.stereotype.Component;

@Component
public class ZonePersistenceMapper {

    public Zone toDomain(ZoneJpaEntity entity) {
        return new Zone(
                entity.getId(),
                entity.getPlantId(),
                entity.getName(),
                entity.getLocation(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public ZoneJpaEntity toEntity(Zone zone) {
        return ZoneJpaEntity.fromDomain(zone);
    }

    public ZoneJpaEntity updateEntity(Zone zone, ZoneJpaEntity entity) {
        entity.apply(zone);
        return entity;
    }
}
