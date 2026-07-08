package com.pvfusion.application.dto.deletion;

public record DeleteImpactCounts(
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
