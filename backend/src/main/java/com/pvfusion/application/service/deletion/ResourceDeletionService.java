package com.pvfusion.application.service.deletion;

import com.pvfusion.application.dto.deletion.DeleteImpactCounts;
import com.pvfusion.application.dto.deletion.DeleteImpactResponse;
import com.pvfusion.application.dto.deletion.DeleteResourceResponse;
import com.pvfusion.application.dto.deletion.DeletionPlan;
import com.pvfusion.application.dto.deletion.StoredFileReference;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.image.ManageImageDeletionUseCase;
import com.pvfusion.application.port.in.inspection.ManageInspectionDeletionUseCase;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.in.plant.ManagePlantDeletionUseCase;
import com.pvfusion.application.port.in.zone.ManageZoneDeletionUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.deletion.DeleteStoredFilePort;
import com.pvfusion.application.port.out.deletion.ResourceDeletionPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceDeletionService implements
        ManagePlantDeletionUseCase,
        ManageZoneDeletionUseCase,
        ManageInspectionDeletionUseCase,
        ManageImageDeletionUseCase {

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;
    private final PlantRepositoryPort plantRepositoryPort;
    private final PlantMemberRepositoryPort plantMemberRepositoryPort;
    private final LoadZonePort loadZonePort;
    private final LoadInspectionPort loadInspectionPort;
    private final LoadImagePort loadImagePort;
    private final AccessChecker accessChecker;
    private final ResourceDeletionPort resourceDeletionPort;
    private final DeleteStoredFilePort deleteStoredFilePort;
    private final RecordOperationLogUseCase recordOperationLogUseCase;

    @Override
    public DeleteImpactResponse getPlantDeleteImpact(Long plantId) {
        User currentUser = requireApprovedUser();
        Plant plant = loadPlant(plantId);
        requirePlantManagePermission(currentUser, plant.getId());
        return toResponse("PLANT", plant.getId(), plant.getName(), 1L, resourceDeletionPort.getPlantImpact(plantId));
    }

    @Override
    public DeleteImpactResponse getZoneDeleteImpact(Long zoneId) {
        User currentUser = requireApprovedUser();
        Zone zone = loadZone(zoneId);
        requirePlantManagePermission(currentUser, zone.getPlantId());
        return toResponse("ZONE", zone.getId(), zone.getName(), 0L, resourceDeletionPort.getZoneImpact(zoneId));
    }

    @Override
    public DeleteImpactResponse getInspectionDeleteImpact(Long inspectionId) {
        User currentUser = requireApprovedUser();
        Long currentUserId = currentUser.getId();
        ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, inspectionId));
        var inspection = loadInspectionPort.loadInspection(inspectionId)
                .orElseThrow(() -> new NotFoundException("Inspection was not found."));
        return toResponse("INSPECTION", inspection.getId(), inspection.getName(), 0L,
                resourceDeletionPort.getInspectionImpact(inspectionId));
    }

    @Override
    public DeleteImpactResponse getImageDeleteImpact(Long imageId) {
        User currentUser = requireApprovedUser();
        Long currentUserId = currentUser.getId();
        ensureAllowed(accessChecker.checkImageAccess(currentUserId, imageId));
        var image = loadImagePort.loadImage(imageId)
                .orElseThrow(() -> new NotFoundException("Image was not found."));
        return toResponse("IMAGE", image.getId(), image.getOriginalFilename(), 0L,
                resourceDeletionPort.getImageImpact(imageId));
    }

    @Override
    @Transactional
    public DeleteResourceResponse deletePlant(Long plantId) {
        User currentUser = requireApprovedUser();
        Plant plant = loadPlant(plantId);
        requirePlantManagePermission(currentUser, plant.getId());

        DeletionPlan plan = resourceDeletionPort.deletePlant(plantId);
        scheduleStoredFileDeletion(plan.filesToDelete(), "plant", plantId);
        recordDeleteLog(currentUser.getId(), OperationEventType.PLANT_DELETED, "plants", plantId, plant.getName());
        return new DeleteResourceResponse("PLANT", plantId, plant.getName());
    }

    @Override
    @Transactional
    public DeleteResourceResponse deleteZone(Long zoneId) {
        User currentUser = requireApprovedUser();
        Zone zone = loadZone(zoneId);
        requirePlantManagePermission(currentUser, zone.getPlantId());

        DeletionPlan plan = resourceDeletionPort.deleteZone(zoneId);
        scheduleStoredFileDeletion(plan.filesToDelete(), "zone", zoneId);
        recordDeleteLog(currentUser.getId(), OperationEventType.ZONE_DELETED, "zones", zoneId, zone.getName());
        return new DeleteResourceResponse("ZONE", zoneId, zone.getName());
    }

    @Override
    @Transactional
    public DeleteResourceResponse deleteInspection(Long inspectionId) {
        User currentUser = requireApprovedUser();
        Long currentUserId = currentUser.getId();
        ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, inspectionId));
        var inspection = loadInspectionPort.loadInspection(inspectionId)
                .orElseThrow(() -> new NotFoundException("Inspection was not found."));

        DeletionPlan plan = resourceDeletionPort.deleteInspection(inspectionId);
        scheduleStoredFileDeletion(plan.filesToDelete(), "inspection", inspectionId);
        recordDeleteLog(currentUser.getId(), OperationEventType.INSPECTION_DELETED, "inspections", inspectionId, inspection.getName());
        return new DeleteResourceResponse("INSPECTION", inspectionId, inspection.getName());
    }

    @Override
    @Transactional
    public DeleteResourceResponse deleteImage(Long imageId) {
        User currentUser = requireApprovedUser();
        Long currentUserId = currentUser.getId();
        ensureAllowed(accessChecker.checkImageAccess(currentUserId, imageId));
        var image = loadImagePort.loadImage(imageId)
                .orElseThrow(() -> new NotFoundException("Image was not found."));

        DeletionPlan plan = resourceDeletionPort.deleteImage(imageId);
        scheduleStoredFileDeletion(plan.filesToDelete(), "image", imageId);
        recordDeleteLog(currentUser.getId(), OperationEventType.IMAGE_DELETED, "inspection_images", imageId, image.getOriginalFilename());
        return new DeleteResourceResponse("IMAGE", imageId, image.getOriginalFilename());
    }

    private void scheduleStoredFileDeletion(List<StoredFileReference> filesToDelete, String resourceType, Long resourceId) {
        if (filesToDelete == null || filesToDelete.isEmpty()) {
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (StoredFileReference file : filesToDelete) {
                    try {
                        deleteStoredFilePort.delete(file);
                    } catch (Exception exception) {
                        log.warn("Failed to delete stored file after {} deletion. resourceId={}, bucket={}, objectKey={}",
                                resourceType,
                                resourceId,
                                file.bucketName(),
                                file.objectKey(),
                                exception);
                    }
                }
            }
        });
    }

    private void recordDeleteLog(Long actorUserId, OperationEventType eventType, String targetTable, Long targetId, String resourceName) {
        recordOperationLogUseCase.execute(new RecordOperationLogCommand(
                actorUserId,
                OperationEventCategory.ADMIN,
                eventType,
                targetTable,
                targetId,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "Resource deleted.",
                null,
                null,
                "resourceName=" + resourceName
        ));
    }

    private DeleteImpactResponse toResponse(
            String resourceType,
            Long resourceId,
            String resourceName,
            long plantCount,
            DeleteImpactCounts counts
    ) {
        return new DeleteImpactResponse(
                resourceType,
                resourceId,
                resourceName,
                plantCount,
                counts.plantMemberCount(),
                counts.zoneCount(),
                counts.equipmentCount(),
                counts.inspectionCount(),
                counts.imageCount(),
                counts.analysisJobCount(),
                counts.analysisResultCount(),
                counts.detectedDefectCount(),
                counts.reviewHistoryCount(),
                counts.operationLogCount(),
                counts.storageFileCount()
        );
    }

    private User requireApprovedUser() {
        Long currentUserId = requireCurrentUserId();
        User currentUser = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("Current authenticated user was not found."));

        if (currentUser.isInactive()) {
            throw new UserDeactivatedException();
        }
        if (currentUser.isPending()) {
            throw new ApprovalRequiredException();
        }
        return currentUser;
    }

    private Long requireCurrentUserId() {
        return currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);
    }

    private Plant loadPlant(Long plantId) {
        return plantRepositoryPort.findById(plantId)
                .orElseThrow(() -> new NotFoundException("Plant was not found."));
    }

    private Zone loadZone(Long zoneId) {
        return loadZonePort.loadZone(zoneId)
                .orElseThrow(() -> new NotFoundException("Zone was not found."));
    }

    private void requirePlantManagePermission(User currentUser, Long plantId) {
        if (currentUser.isAdmin()) {
            return;
        }

        PlantMember plantMember = plantMemberRepositoryPort.findByPlantIdAndUserId(plantId, currentUser.getId())
                .orElseThrow(() -> new ForbiddenException("Plant manage permission is denied."));
        if (plantMember.isInactive() || !plantMember.hasManageRole()) {
            throw new ForbiddenException("Plant manage permission is denied.");
        }
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new ForbiddenException();
        }
    }
}
