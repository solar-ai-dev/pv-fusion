package com.pvfusion.service.image;

import com.pvfusion.application.dto.image.DeactivateImageCommand;
import com.pvfusion.application.dto.image.GetImagePreviewQuery;
import com.pvfusion.application.dto.image.GetImageQuery;
import com.pvfusion.application.dto.image.ImageAccessUrlRequest;
import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.application.dto.image.ImagePreviewResponse;
import com.pvfusion.application.dto.image.ImageResponse;
import com.pvfusion.application.dto.image.ImageStorageRequest;
import com.pvfusion.application.dto.image.ImageStorageResult;
import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.dto.image.RegisterImageMetadataCommand;
import com.pvfusion.application.dto.image.UploadImageCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.image.DeactivateImageUseCase;
import com.pvfusion.application.port.in.image.GetImagePreviewUseCase;
import com.pvfusion.application.port.in.image.GetImageUseCase;
import com.pvfusion.application.port.in.image.QueryImageUseCase;
import com.pvfusion.application.port.in.image.RegisterImageMetadataUseCase;
import com.pvfusion.application.port.in.image.UploadImageUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.equipment.LoadEquipmentPort;
import com.pvfusion.application.port.out.image.GenerateImageAccessUrlPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.image.SaveImagePort;
import com.pvfusion.application.port.out.image.StoreImageFilePort;
import com.pvfusion.application.port.out.image.UpdateImagePort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.image.UploadStatus;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.UnauthorizedException;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ImageService implements
        UploadImageUseCase,
        RegisterImageMetadataUseCase,
        QueryImageUseCase,
        GetImageUseCase,
        GetImagePreviewUseCase,
        DeactivateImageUseCase {

    private final LoadImagePort loadImagePort;
    private final SaveImagePort saveImagePort;
    private final UpdateImagePort updateImagePort;
    private final StoreImageFilePort storeImageFilePort;
    private final GenerateImageAccessUrlPort generateImageAccessUrlPort;
    private final LoadInspectionPort loadInspectionPort;
    private final AccessChecker accessChecker;
    private final LoadEquipmentPort loadEquipmentPort;
    private final Optional<LoadZonePort> loadZonePort;
    private final CurrentUserPort currentUserPort;

    @Override
    @Transactional
    public ImageResponse execute(UploadImageCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateUploadCommand(command);

        Inspection inspection = loadInspection(command.inspectionId());
        ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, command.inspectionId()));
        validateTargetAndEquipment(command.targetType(), command.equipmentId(), inspection);
        validateDuplicateUpload(command.inspectionId(), command.targetType(), command.equipmentId(), command.imageType());

        ImageStorageResult storageResult = storeImageFilePort.store(new ImageStorageRequest(
                command.inspectionId(),
                null,
                command.imageType(),
                command.targetType(),
                command.originalFilename(),
                command.mimeType(),
                command.sourceKey(),
                command.fileContent()
        ));

        return saveMetadata(new RegisterImageMetadataCommand(
                currentUserId,
                command.inspectionId(),
                command.equipmentId(),
                command.targetType(),
                command.imageType(),
                command.originalFilename(),
                command.mimeType(),
                command.fileSize(),
                command.capturedAt(),
                storageResult
        ), currentUserId);
    }

    @Override
    @Transactional
    public ImageResponse execute(RegisterImageMetadataCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.inspectionId(), "inspectionId");
        validateRequired(command.targetType(), "targetType");
        validateRequired(command.imageType(), "imageType");
        validateRequired(command.storageResult(), "storageResult");

        loadInspection(command.inspectionId());
        validateTargetAndEquipment(command.targetType(), command.equipmentId(), null);
        validateDuplicateUpload(command.inspectionId(), command.targetType(), command.equipmentId(), command.imageType());

        return saveMetadata(command, currentUserId);
    }

    @Override
    public List<ImageSummaryResponse> execute(ImageListQuery query) {
        requireCurrentUserId();
        validateQueryScope(query);

        if (query.inspectionId() != null) {
            loadInspection(query.inspectionId());
        }

        return loadImagePort.loadImages(query).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Override
    public ImageResponse execute(GetImageQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.imageId(), "imageId");

        ensureAllowed(accessChecker.checkImageAccess(currentUserId, query.imageId()));
        return toResponse(loadImage(query.imageId()));
    }

    @Override
    public ImagePreviewResponse execute(GetImagePreviewQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.imageId(), "imageId");

        ensureAllowed(accessChecker.checkImageAccess(currentUserId, query.imageId()));
        InspectionImage image = loadImage(query.imageId());
        var accessUrlResult = generateImageAccessUrlPort.generate(
                new ImageAccessUrlRequest(image.getBucketName(), image.getObjectKey())
        );

        return new ImagePreviewResponse(image.getId(), accessUrlResult.accessUrl(), accessUrlResult.expiresAt());
    }

    @Override
    @Transactional
    public ImageResponse execute(DeactivateImageCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.imageId(), "imageId");

        ensureAllowed(accessChecker.checkImageAccess(currentUserId, command.imageId()));
        InspectionImage existing = loadImage(command.imageId());

        InspectionImage deactivated = new InspectionImage(
                existing.getId(),
                existing.getInspectionId(),
                existing.getEquipmentId(),
                existing.getTargetType(),
                existing.getImageType(),
                existing.getOriginalFilename(),
                existing.getMimeType(),
                existing.getFileSize(),
                existing.getBucketName(),
                existing.getObjectKey(),
                existing.getFileUrl(),
                existing.getCapturedAt(),
                existing.getUploadStatus(),
                ResourceStatus.INACTIVE,
                existing.getUploadedByUserId(),
                existing.getCreatedAt(),
                existing.getUpdatedAt()
        );

        return toResponse(updateImagePort.updateImage(deactivated));
    }

    private ImageResponse saveMetadata(RegisterImageMetadataCommand command, Long currentUserId) {
        InspectionImage saved = saveImagePort.saveImage(new InspectionImage(
                null,
                command.inspectionId(),
                command.equipmentId(),
                command.targetType(),
                command.imageType(),
                command.originalFilename(),
                command.mimeType(),
                command.fileSize(),
                command.storageResult().bucketName(),
                command.storageResult().objectKey(),
                command.storageResult().fileUrl(),
                command.capturedAt(),
                UploadStatus.UPLOADED,
                ResourceStatus.ACTIVE,
                currentUserId,
                null,
                null
        ));

        return toResponse(saved);
    }

    private InspectionImage loadImage(Long imageId) {
        return loadImagePort.loadImage(imageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Image not found: " + imageId));
    }

    private Inspection loadInspection(Long inspectionId) {
        return loadInspectionPort.loadInspection(inspectionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Inspection not found: " + inspectionId));
    }

    private void validateDuplicateUpload(
            Long inspectionId,
            TargetType targetType,
            Long equipmentId,
            com.pvfusion.domain.image.ImageType imageType
    ) {
        boolean duplicated = loadImagePort.loadImage(
                inspectionId,
                targetType,
                equipmentId,
                imageType,
                ResourceStatus.ACTIVE
        ).isPresent();

        if (duplicated) {
            throw new BusinessException(ErrorCode.DUPLICATE_IMAGE_UPLOAD);
        }
    }

    private void validateUploadCommand(UploadImageCommand command) {
        validateRequired(command.inspectionId(), "inspectionId");
        validateRequired(command.targetType(), "targetType");
        validateRequired(command.imageType(), "imageType");
        validateText(command.originalFilename(), "originalFilename");
        validateText(command.mimeType(), "mimeType");
        validateRequired(command.fileSize(), "fileSize");
        validateRequired(command.fileContent(), "fileContent");

        if (!command.mimeType().startsWith("image/")) {
            throw new BusinessException(ErrorCode.INVALID_FILE_FORMAT, "Only image mime types are allowed.");
        }
        if (command.fileSize() <= 0 || command.fileContent().length == 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "fileSize must be greater than zero.");
        }
        if (command.fileSize() != command.fileContent().length) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "fileSize does not match file content length.");
        }
    }

    private void validateTargetAndEquipment(TargetType targetType, Long equipmentId, Inspection inspection) {
        if (targetType == TargetType.ZONE) {
            if (equipmentId != null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "equipmentId must be null for ZONE target.");
            }
            return;
        }

        if (equipmentId == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "equipmentId is required for non-ZONE target.");
        }

        Equipment equipment = loadEquipmentPort.loadEquipment(equipmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Equipment not found: " + equipmentId));

        if (inspection != null && !inspection.getZoneId().equals(equipment.getZoneId())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "equipmentId does not belong to the inspection zone.");
        }
    }

    private void validateQueryScope(ImageListQuery query) {
        Long currentUserId = requireCurrentUserId();
        boolean admin = accessChecker.isAdmin(currentUserId);
        if (admin) {
            return;
        }

        boolean scoped = query.plantId() != null
                || query.zoneId() != null
                || query.inspectionId() != null
                || query.equipmentId() != null;

        if (!scoped) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Non-admin image queries require scoped filters.");
        }

        if (query.plantId() != null) {
            ensureAllowed(accessChecker.checkPlantAccess(currentUserId, query.plantId()));
        }
        if (query.zoneId() != null) {
            ensureAllowed(accessChecker.checkZoneAccess(currentUserId, query.zoneId()));
        }
        if (query.inspectionId() != null) {
            ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, query.inspectionId()));
        }
        if (query.equipmentId() != null) {
            ensureAllowed(accessChecker.checkEquipmentAccess(currentUserId, query.equipmentId()));
        }
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private ImageSummaryResponse toSummaryResponse(InspectionImage image) {
        ImageContext context = resolveContext(image.getInspectionId());
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

    private ImageResponse toResponse(InspectionImage image) {
        ImageContext context = resolveContext(image.getInspectionId());
        return new ImageResponse(
                image.getId(),
                image.getInspectionId(),
                context.plantId(),
                context.zoneId(),
                image.getEquipmentId(),
                image.getTargetType(),
                image.getImageType(),
                image.getOriginalFilename(),
                image.getMimeType(),
                image.getFileSize(),
                null,
                null,
                null,
                image.getCapturedAt(),
                image.getUploadStatus(),
                image.getStatus(),
                image.getUploadedByUserId(),
                image.getCreatedAt(),
                image.getUpdatedAt()
        );
    }

    private ImageContext resolveContext(Long inspectionId) {
        Inspection inspection = loadInspectionPort.loadInspection(inspectionId).orElse(null);
        if (inspection == null) {
            return new ImageContext(null, null);
        }
        if (loadZonePort.isEmpty()) {
            return new ImageContext(inspection.getZoneId(), null);
        }
        Zone zone = loadZonePort.get().loadZone(inspection.getZoneId()).orElse(null);
        return new ImageContext(inspection.getZoneId(), zone != null ? zone.getPlantId() : null);
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

    private void validateText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }

    private record ImageContext(Long zoneId, Long plantId) {
    }
}
