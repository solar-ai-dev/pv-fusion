package com.pvfusion.application.port.out.access;

public interface AccessChecker {

    boolean isAdmin(Long userId);

    void checkZoneAccess(Long userId, Long zoneId);

    void checkEquipmentAccess(Long userId, Long equipmentId);

    void checkInspectionAccess(Long userId, Long inspectionId);

    void checkImageAccess(Long userId, Long imageId);

    void checkImagePairAccess(Long userId, Long imagePairId);

    void checkAnalysisJobAccess(Long userId, Long jobId);

    void checkResultAccess(Long userId, Long resultId);
}
