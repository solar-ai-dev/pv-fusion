package com.pvfusion.adapter.out.persistence.image;

import com.pvfusion.domain.image.InspectionImage;

public final class InspectionImagePersistenceMapper {

    private InspectionImagePersistenceMapper() {
    }

    public static InspectionImageJpaEntity toEntity(InspectionImage image) {
        return new InspectionImageJpaEntity(
                image.getId(),
                image.getInspectionId(),
                image.getEquipmentId(),
                image.getTargetType(),
                image.getImageType(),
                image.getOriginalFilename(),
                image.getMimeType(),
                image.getFileSize(),
                image.getBucketName(),
                image.getObjectKey(),
                image.getFileUrl(),
                image.getCapturedAt(),
                image.getUploadStatus(),
                image.getStatus(),
                image.getUploadedByUserId()
        );
    }

    public static InspectionImage toDomain(InspectionImageJpaEntity entity) {
        return new InspectionImage(
                entity.getId(),
                entity.getInspectionId(),
                entity.getEquipmentId(),
                entity.getTargetType(),
                entity.getImageType(),
                entity.getOriginalFilename(),
                entity.getMimeType(),
                entity.getFileSize(),
                entity.getBucketName(),
                entity.getObjectKey(),
                entity.getFileUrl(),
                entity.getCapturedAt(),
                entity.getUploadStatus(),
                entity.getStatus(),
                entity.getUploadedByUserId(),
                entity.getCreatedAtOffsetDateTime(),
                entity.getUpdatedAtOffsetDateTime()
        );
    }
}
