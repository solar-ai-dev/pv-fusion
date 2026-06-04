package com.pvfusion.application.port.in.access;

public interface AccessChecker {

    boolean isAdmin(Long userId);

    boolean checkPlantAccess(Long userId, Long plantId);

    boolean checkZoneAccess(Long userId, Long zoneId);

    boolean checkEquipmentAccess(Long userId, Long equipmentId);

    // Team 2 domain access checks will be implemented after their query ports are defined.
    boolean checkInspectionAccess(Long userId, Long inspectionId);

    boolean checkImageAccess(Long userId, Long imageId);

    boolean checkImagePairAccess(Long userId, Long imagePairId);

    boolean checkAnalysisJobAccess(Long userId, Long jobId);

    boolean checkResultAccess(Long userId, Long resultId);
}
