package com.pvfusion.service.imagepair;

import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.dto.imagepair.CreateImagePairCommand;
import com.pvfusion.application.dto.imagepair.DeactivateImagePairCommand;
import com.pvfusion.application.dto.imagepair.GetImagePairQuery;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateResponse;
import com.pvfusion.application.dto.imagepair.ImagePairResponse;
import com.pvfusion.application.dto.imagepair.UpdateImagePairCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.imagepair.CreateImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.DeactivateImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.GetImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.QueryImagePairCandidateUseCase;
import com.pvfusion.application.port.in.imagepair.UpdateImagePairUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.equipment.LoadEquipmentPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.imagepair.SaveImagePairPort;
import com.pvfusion.application.port.out.imagepair.UpdateImagePairPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.imagepair.ImagePair;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.UnauthorizedException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ImagePairService implements
        QueryImagePairCandidateUseCase,
        CreateImagePairUseCase,
        GetImagePairUseCase,
        UpdateImagePairUseCase,
        DeactivateImagePairUseCase {

    private final LoadImagePairPort loadImagePairPort;
    private final SaveImagePairPort saveImagePairPort;
    private final UpdateImagePairPort updateImagePairPort;
    private final LoadImagePort loadImagePort;
    private final LoadInspectionPort loadInspectionPort;
    private final LoadEquipmentPort loadEquipmentPort;
    private final AccessChecker accessChecker;
    private final Optional<LoadZonePort> loadZonePort;
    private final CurrentUserPort currentUserPort;

    @Override
    public ImagePairCandidateResponse execute(ImagePairCandidateQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.inspectionId(), "inspectionId");
        validateCandidateTarget(query.targetType(), query.equipmentId());

        Inspection inspection = loadInspection(query.inspectionId());
        ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, query.inspectionId()));
        validateEquipmentScope(query.targetType(), query.equipmentId(), inspection);

        List<InspectionImage> rgbImages = loadImagePort.loadImages(new ImageListQuery(
                null,
                null,
                null,
                query.inspectionId(),
                query.equipmentId(),
                ImageType.RGB,
                query.targetType(),
                ResourceStatus.ACTIVE
        ));
        List<InspectionImage> thermalImages = loadImagePort.loadImages(new ImageListQuery(
                null,
                null,
                null,
                query.inspectionId(),
                query.equipmentId(),
                ImageType.THERMAL,
                query.targetType(),
                ResourceStatus.ACTIVE
        ));

        Set<Long> pairedRgbIds = new HashSet<>();
        Set<Long> pairedThermalIds = new HashSet<>();
        for (ImagePair imagePair : loadImagePairPort.loadImagePairsByStatus(query.inspectionId(), ResourceStatus.ACTIVE)) {
            if (imagePair.getTargetType() == query.targetType()
                    && sameEquipment(imagePair.getEquipmentId(), query.equipmentId())) {
                pairedRgbIds.add(imagePair.getRgbImageId());
                pairedThermalIds.add(imagePair.getThermalImageId());
            }
        }

        ImageContext context = resolveContext(inspection);
        return new ImagePairCandidateResponse(
                query.inspectionId(),
                context.plantId(),
                context.zoneId(),
                query.equipmentId(),
                rgbImages.stream()
                        .filter(image -> !pairedRgbIds.contains(image.getId()))
                        .map(this::toImageSummary)
                        .toList(),
                thermalImages.stream()
                        .filter(image -> !pairedThermalIds.contains(image.getId()))
                        .map(this::toImageSummary)
                        .toList()
        );
    }

    @Override
    @Transactional
    public ImagePairResponse execute(CreateImagePairCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.rgbImageId(), "rgbImageId");
        validateRequired(command.thermalImageId(), "thermalImageId");

        PairValidationResult validation = validatePair(command.rgbImageId(), command.thermalImageId(), null);
        ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, validation.inspection().getId()));

        ImagePair saved = saveImagePairPort.saveImagePair(new ImagePair(
                null,
                validation.rgbImage().getInspectionId(),
                validation.rgbImage().getEquipmentId(),
                validation.rgbImage().getTargetType(),
                validation.rgbImage().getId(),
                validation.thermalImage().getId(),
                ResourceStatus.ACTIVE,
                currentUserId,
                null,
                null
        ));

        return toResponse(saved);
    }

    @Override
    public ImagePairResponse execute(GetImagePairQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.imagePairId(), "imagePairId");

        ensureAllowed(accessChecker.checkImagePairAccess(currentUserId, query.imagePairId()));
        return toResponse(loadImagePair(query.imagePairId()));
    }

    @Override
    @Transactional
    public ImagePairResponse execute(UpdateImagePairCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.imagePairId(), "imagePairId");

        ensureAllowed(accessChecker.checkImagePairAccess(currentUserId, command.imagePairId()));
        ImagePair existing = loadImagePair(command.imagePairId());
        if (existing.getStatus() != ResourceStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Only active image pairs can be updated.");
        }

        Long nextRgbImageId = command.rgbImageId() != null ? command.rgbImageId() : existing.getRgbImageId();
        Long nextThermalImageId = command.thermalImageId() != null ? command.thermalImageId() : existing.getThermalImageId();

        PairValidationResult validation = validatePair(nextRgbImageId, nextThermalImageId, existing.getId());
        ImagePair updated = new ImagePair(
                existing.getId(),
                validation.rgbImage().getInspectionId(),
                validation.rgbImage().getEquipmentId(),
                validation.rgbImage().getTargetType(),
                validation.rgbImage().getId(),
                validation.thermalImage().getId(),
                existing.getStatus(),
                existing.getCreatedByUserId(),
                existing.getCreatedAt(),
                existing.getUpdatedAt()
        );

        return toResponse(updateImagePairPort.updateImagePair(updated));
    }

    @Override
    @Transactional
    public ImagePairResponse execute(DeactivateImagePairCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.imagePairId(), "imagePairId");

        ensureAllowed(accessChecker.checkImagePairAccess(currentUserId, command.imagePairId()));
        ImagePair existing = loadImagePair(command.imagePairId());

        ImagePair updated = new ImagePair(
                existing.getId(),
                existing.getInspectionId(),
                existing.getEquipmentId(),
                existing.getTargetType(),
                existing.getRgbImageId(),
                existing.getThermalImageId(),
                ResourceStatus.INACTIVE,
                existing.getCreatedByUserId(),
                existing.getCreatedAt(),
                existing.getUpdatedAt()
        );

        return toResponse(updateImagePairPort.updateImagePair(updated));
    }

    private PairValidationResult validatePair(Long rgbImageId, Long thermalImageId, Long currentPairId) {
        if (rgbImageId.equals(thermalImageId)) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "rgbImageId and thermalImageId must be different.");
        }

        InspectionImage rgbImage = loadImage(rgbImageId);
        InspectionImage thermalImage = loadImage(thermalImageId);

        if (rgbImage.getStatus() != ResourceStatus.ACTIVE || thermalImage.getStatus() != ResourceStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "Both images must be active.");
        }
        if (rgbImage.getImageType() != ImageType.RGB || thermalImage.getImageType() != ImageType.THERMAL) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "Images must be RGB and THERMAL respectively.");
        }
        if (!rgbImage.getInspectionId().equals(thermalImage.getInspectionId())) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "Images must belong to the same inspection.");
        }
        if (rgbImage.getTargetType() != thermalImage.getTargetType()) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "Images must have the same targetType.");
        }
        if (!sameEquipment(rgbImage.getEquipmentId(), thermalImage.getEquipmentId())) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "Images must have the same equipmentId.");
        }

        Inspection inspection = loadInspection(rgbImage.getInspectionId());
        validateEquipmentScope(rgbImage.getTargetType(), rgbImage.getEquipmentId(), inspection);

        Optional<ImagePair> duplicatePair = loadImagePairPort.loadImagePair(rgbImageId, thermalImageId);
        if (duplicatePair.isPresent() && !duplicatePair.get().getId().equals(currentPairId)) {
            throw new BusinessException(ErrorCode.PAIR_ALREADY_EXISTS);
        }

        Optional<ImagePair> activePair = loadImagePairPort.loadActiveImagePair(
                rgbImage.getInspectionId(),
                rgbImage.getTargetType(),
                rgbImage.getEquipmentId()
        );
        if (activePair.isPresent() && !activePair.get().getId().equals(currentPairId)) {
            throw new BusinessException(ErrorCode.PAIR_ALREADY_EXISTS, "Active pair already exists for this target.");
        }

        return new PairValidationResult(inspection, rgbImage, thermalImage);
    }

    private void validateCandidateTarget(TargetType targetType, Long equipmentId) {
        validateRequired(targetType, "targetType");
        if (targetType == TargetType.ZONE) {
            if (equipmentId != null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "equipmentId must be null for ZONE target.");
            }
            return;
        }
        if (equipmentId == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "equipmentId is required for non-ZONE target.");
        }
    }

    private void validateEquipmentScope(TargetType targetType, Long equipmentId, Inspection inspection) {
        if (targetType == TargetType.ZONE) {
            if (equipmentId != null) {
                throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "ZONE target must not have equipmentId.");
            }
            return;
        }
        if (equipmentId == null) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "equipmentId is required for non-ZONE target.");
        }
        Equipment equipment = loadEquipmentPort.loadEquipment(equipmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Equipment not found: " + equipmentId));
        if (!inspection.getZoneId().equals(equipment.getZoneId())) {
            throw new BusinessException(ErrorCode.PAIR_CONDITION_MISMATCH, "equipmentId does not belong to inspection zone.");
        }
    }

    private ImagePairResponse toResponse(ImagePair imagePair) {
        ImageContext context = resolveContext(loadInspection(imagePair.getInspectionId()));
        InspectionImage rgbImage = loadImage(imagePair.getRgbImageId());
        InspectionImage thermalImage = loadImage(imagePair.getThermalImageId());

        return new ImagePairResponse(
                imagePair.getId(),
                imagePair.getInspectionId(),
                context.plantId(),
                context.zoneId(),
                imagePair.getEquipmentId(),
                imagePair.getTargetType(),
                imagePair.getRgbImageId(),
                imagePair.getThermalImageId(),
                imagePair.getStatus(),
                imagePair.getCreatedByUserId(),
                imagePair.getCreatedAt(),
                imagePair.getUpdatedAt(),
                toImageSummary(rgbImage),
                toImageSummary(thermalImage)
        );
    }

    private ImageSummaryResponse toImageSummary(InspectionImage image) {
        ImageContext context = resolveContext(loadInspection(image.getInspectionId()));
        return new ImageSummaryResponse(
                image.getId(),
                image.getInspectionId(),
                context.plantId(),
                context.zoneId(),
                image.getEquipmentId(),
                image.getTargetType(),
                image.getImageType(),
                image.getOriginalFilename(),
                null,
                image.getUploadStatus(),
                image.getStatus(),
                image.getCapturedAt()
        );
    }

    private ImageContext resolveContext(Inspection inspection) {
        if (loadZonePort.isEmpty()) {
            return new ImageContext(inspection.getZoneId(), null);
        }
        Zone zone = loadZonePort.get().loadZone(inspection.getZoneId()).orElse(null);
        return new ImageContext(inspection.getZoneId(), zone != null ? zone.getPlantId() : null);
    }

    private ImagePair loadImagePair(Long imagePairId) {
        return loadImagePairPort.loadImagePair(imagePairId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "ImagePair not found: " + imagePairId));
    }

    private InspectionImage loadImage(Long imageId) {
        return loadImagePort.loadImage(imageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Image not found: " + imageId));
    }

    private Inspection loadInspection(Long inspectionId) {
        return loadInspectionPort.loadInspection(inspectionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Inspection not found: " + inspectionId));
    }

    private boolean sameEquipment(Long left, Long right) {
        return left == null ? right == null : left.equals(right);
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private Long requireCurrentUserId() {
        return currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);
    }

    private void validateRequired(Object value, String fieldName) {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }

    private record PairValidationResult(
            Inspection inspection,
            InspectionImage rgbImage,
            InspectionImage thermalImage
    ) {
    }

    private record ImageContext(Long zoneId, Long plantId) {
    }
}
