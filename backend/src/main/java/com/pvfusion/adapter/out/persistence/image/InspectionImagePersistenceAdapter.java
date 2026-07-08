package com.pvfusion.adapter.out.persistence.image;

import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.image.SaveImagePort;
import com.pvfusion.application.port.out.image.UpdateImagePort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.image.InspectionImage;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InspectionImagePersistenceAdapter implements LoadImagePort, SaveImagePort, UpdateImagePort {

    private final InspectionImageJpaRepository inspectionImageJpaRepository;

    @Override
    public Optional<InspectionImage> loadImage(Long imageId) {
        return inspectionImageJpaRepository.findById(imageId)
                .map(InspectionImagePersistenceMapper::toDomain);
    }

    @Override
    public List<InspectionImage> loadImages(ImageListQuery query) {
        return inspectionImageJpaRepository.search(
                        query.plantId(),
                        query.zoneId(),
                        query.inspectionId(),
                        query.equipmentId(),
                        query.imageType() != null ? query.imageType().name() : null,
                        query.targetType() != null ? query.targetType().name() : null,
                        query.status() != null ? query.status().name() : null
                )
                .stream()
                .map(InspectionImagePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<InspectionImage> loadImage(
            Long inspectionId,
            String originalFilename,
            ResourceStatus status
    ) {
        return inspectionImageJpaRepository.findLatestByInspectionIdAndOriginalFilename(
                        inspectionId,
                        originalFilename,
                        status.name()
                )
                .map(InspectionImagePersistenceMapper::toDomain);
    }

    @Override
    public InspectionImage saveImage(InspectionImage inspectionImage) {
        InspectionImageJpaEntity saved = inspectionImageJpaRepository.save(
                InspectionImagePersistenceMapper.toEntity(inspectionImage)
        );
        return InspectionImagePersistenceMapper.toDomain(saved);
    }

    @Override
    public InspectionImage updateImage(InspectionImage inspectionImage) {
        InspectionImageJpaEntity saved = inspectionImageJpaRepository.save(
                InspectionImagePersistenceMapper.toEntity(inspectionImage)
        );
        return InspectionImagePersistenceMapper.toDomain(saved);
    }
}
