package com.pvfusion.adapter.out.persistence.imagepair;

import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.imagepair.SaveImagePairPort;
import com.pvfusion.application.port.out.imagepair.UpdateImagePairPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.imagepair.ImagePair;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ImagePairPersistenceAdapter implements LoadImagePairPort, SaveImagePairPort, UpdateImagePairPort {

    private final ImagePairJpaRepository imagePairJpaRepository;

    @Override
    public Optional<ImagePair> loadImagePair(Long imagePairId) {
        return imagePairJpaRepository.findById(imagePairId)
                .map(ImagePairPersistenceMapper::toDomain);
    }

    @Override
    public List<ImagePair> loadImagePairs(ImagePairCandidateQuery query) {
        return imagePairJpaRepository.search(
                        query.inspectionId(),
                        query.targetType() != null ? query.targetType().name() : null,
                        query.equipmentId()
                )
                .stream()
                .map(ImagePairPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<ImagePair> loadImagePair(Long rgbImageId, Long thermalImageId) {
        return imagePairJpaRepository.findPair(rgbImageId, thermalImageId)
                .map(ImagePairPersistenceMapper::toDomain);
    }

    @Override
    public Optional<ImagePair> loadActiveImagePair(Long inspectionId, TargetType targetType, Long equipmentId) {
        return imagePairJpaRepository.findActivePair(
                        inspectionId,
                        targetType.name(),
                        equipmentId,
                        ResourceStatus.ACTIVE.name()
                )
                .map(ImagePairPersistenceMapper::toDomain);
    }

    @Override
    public List<ImagePair> loadImagePairsByStatus(Long inspectionId, ResourceStatus status) {
        return imagePairJpaRepository.findByInspectionIdAndStatus(inspectionId, status.name())
                .stream()
                .map(ImagePairPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public ImagePair saveImagePair(ImagePair imagePair) {
        ImagePairJpaEntity saved = imagePairJpaRepository.save(ImagePairPersistenceMapper.toEntity(imagePair));
        return ImagePairPersistenceMapper.toDomain(saved);
    }

    @Override
    public ImagePair updateImagePair(ImagePair imagePair) {
        ImagePairJpaEntity saved = imagePairJpaRepository.save(ImagePairPersistenceMapper.toEntity(imagePair));
        return ImagePairPersistenceMapper.toDomain(saved);
    }
}
