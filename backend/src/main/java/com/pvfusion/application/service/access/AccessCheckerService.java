package com.pvfusion.application.service.access;

import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.equipment.EquipmentRepositoryPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.user.User;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessCheckerService implements AccessChecker {

    private final UserRepositoryPort userRepositoryPort;
    private final PlantRepositoryPort plantRepositoryPort;
    private final PlantMemberRepositoryPort plantMemberRepositoryPort;
    private final ZoneRepositoryPort zoneRepositoryPort;
    private final EquipmentRepositoryPort equipmentRepositoryPort;
    private final LoadInspectionPort loadInspectionPort;
    private final LoadImagePort loadImagePort;
    private final LoadImagePairPort loadImagePairPort;
    private final Optional<LoadAnalysisJobPort> loadAnalysisJobPort;
    private final Optional<LoadAnalysisResultPort> loadAnalysisResultPort;

    @Override
    public boolean isAdmin(Long userId) {
        return getApprovedUser(userId)
                .map(User::isAdmin)
                .orElse(false);
    }

    @Override
    public boolean checkPlantAccess(Long userId, Long plantId) {
        if (userId == null || plantId == null) {
            return false;
        }

        if (isAdmin(userId)) {
            return plantRepositoryPort.findById(plantId).isPresent();
        }

        if (getApprovedUser(userId).isEmpty()) {
            return false;
        }
        if (plantRepositoryPort.findById(plantId).isEmpty()) {
            return false;
        }

        return plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(plantId, userId);
    }

    @Override
    public boolean checkZoneAccess(Long userId, Long zoneId) {
        if (userId == null || zoneId == null) {
            return false;
        }

        return zoneRepositoryPort.findById(zoneId)
                .map(zone -> checkPlantAccess(userId, zone.getPlantId()))
                .orElse(false);
    }

    @Override
    public boolean checkEquipmentAccess(Long userId, Long equipmentId) {
        if (userId == null || equipmentId == null) {
            return false;
        }

        return equipmentRepositoryPort.findById(equipmentId)
                .map(equipment -> checkZoneAccess(userId, equipment.getZoneId()))
                .orElse(false);
    }

    @Override
    public boolean checkInspectionAccess(Long userId, Long inspectionId) {
        if (userId == null || inspectionId == null) {
            return false;
        }

        return loadInspectionPort.loadInspection(inspectionId)
                .map(inspection -> checkZoneAccess(userId, inspection.getZoneId()))
                .orElse(false);
    }

    @Override
    public boolean checkImageAccess(Long userId, Long imageId) {
        if (userId == null || imageId == null) {
            return false;
        }

        return loadImagePort.loadImage(imageId)
                .map(image -> checkInspectionAccess(userId, image.getInspectionId()))
                .orElse(false);
    }

    @Override
    public boolean checkImagePairAccess(Long userId, Long imagePairId) {
        if (userId == null || imagePairId == null) {
            return false;
        }

        return loadImagePairPort.loadImagePair(imagePairId)
                .map(imagePair -> checkInspectionAccess(userId, imagePair.getInspectionId()))
                .orElse(false);
    }

    @Override
    public boolean checkAnalysisJobAccess(Long userId, Long jobId) {
        if (userId == null || jobId == null || loadAnalysisJobPort.isEmpty()) {
            return false;
        }

        return loadAnalysisJobPort.get().loadAnalysisJob(jobId)
                .map(job -> resolveAnalysisJobAccess(userId, job))
                .orElse(false);
    }

    @Override
    public boolean checkResultAccess(Long userId, Long resultId) {
        if (userId == null || resultId == null || loadAnalysisResultPort.isEmpty()) {
            return false;
        }

        return loadAnalysisResultPort.get().loadAnalysisResult(resultId)
                .map(result -> checkAnalysisJobAccess(userId, result.getAnalysisJobId()))
                .orElse(false);
    }

    private boolean resolveAnalysisJobAccess(Long userId, AnalysisJob job) {
        if (job.getImageId() != null) {
            return checkImageAccess(userId, job.getImageId());
        }
        if (job.getImagePairId() != null) {
            return checkImagePairAccess(userId, job.getImagePairId());
        }
        return false;
    }

    private Optional<User> getApprovedUser(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }

        return userRepositoryPort.findById(userId)
                .filter(User::isApproved);
    }
}
