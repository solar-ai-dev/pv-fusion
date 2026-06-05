package com.pvfusion.adapter.out.persistence.plant;

import com.pvfusion.domain.plant.PlantMember;
import org.springframework.stereotype.Component;

@Component
public class PlantMemberPersistenceMapper {

    public PlantMember toDomain(PlantMemberJpaEntity entity) {
        return new PlantMember(
                entity.getId(),
                entity.getPlantId(),
                entity.getUserId(),
                entity.getMemberRole(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public PlantMemberJpaEntity toEntity(PlantMember plantMember) {
        return PlantMemberJpaEntity.fromDomain(plantMember);
    }

    public PlantMemberJpaEntity updateEntity(PlantMember plantMember, PlantMemberJpaEntity entity) {
        entity.apply(plantMember);
        return entity;
    }
}
