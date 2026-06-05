package com.pvfusion.adapter.out.persistence.imagepair;

import com.pvfusion.domain.imagepair.ImagePair;

public final class ImagePairPersistenceMapper {

    private ImagePairPersistenceMapper() {
    }

    public static ImagePairJpaEntity toEntity(ImagePair imagePair) {
        return new ImagePairJpaEntity(
                imagePair.getId(),
                imagePair.getInspectionId(),
                imagePair.getEquipmentId(),
                imagePair.getTargetType(),
                imagePair.getRgbImageId(),
                imagePair.getThermalImageId(),
                imagePair.getStatus(),
                imagePair.getCreatedByUserId()
        );
    }

    public static ImagePair toDomain(ImagePairJpaEntity entity) {
        return new ImagePair(
                entity.getId(),
                entity.getInspectionId(),
                entity.getEquipmentId(),
                entity.getTargetType(),
                entity.getRgbImageId(),
                entity.getThermalImageId(),
                entity.getStatus(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
