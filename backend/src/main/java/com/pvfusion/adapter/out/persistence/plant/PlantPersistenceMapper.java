package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.domain.plant.Plant;
import org.springframework.stereotype.Component;

@Component
public class PlantPersistenceMapper {

    public Plant toDomain(PlantJpaEntity entity) {
        return new Plant(
                entity.getId(),
                entity.getName(),
                entity.getLocation(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public PlantJpaEntity toEntity(Plant plant) {
        return PlantJpaEntity.fromDomain(plant);
    }

    public PlantJpaEntity updateEntity(Plant plant, PlantJpaEntity entity) {
        entity.apply(plant);
        return entity;
    }
}
