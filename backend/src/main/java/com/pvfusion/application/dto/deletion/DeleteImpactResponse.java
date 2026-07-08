package com.pvfusion.application.dto.deletion;

public record DeleteImpactResponse(
        String resourceType,
        Long resourceId,
        String resourceName,
        long plantCount,
        long plantMemberCount,
        long zoneCount,
        long equipmentCount,
        long inspectionCount,
        long imageCount,
        long analysisJobCount,
        long analysisResultCount,
        long detectedDefectCount,
        long reviewHistoryCount,
        long operationLogCount,
        long storageFileCount
) {
}
