package com.pvfusion.adapter.in.web.result;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record SaveAnalysisResultRequest(
        Long analysisJobId,
        String modelName,
        String modelVersion,
        String modelFormat,
        String runtime,
        Integer inputSize,
        BigDecimal threshold,
        AnalysisResultStatus resultStatus,
        Integer anomalyCount,
        BigDecimal maxConfidence,
        BigDecimal areaRatio,
        BigDecimal severityScore,
        SeverityLevel severityLevel,
        ActionCandidate actionCandidate,
        PriorityLevel priorityLevel,
        String bboxBucketName,
        String bboxObjectKey,
        String bboxFileUrl,
        String heatmapBucketName,
        String heatmapObjectKey,
        String heatmapFileUrl,
        String maskBucketName,
        String maskObjectKey,
        String maskFileUrl,
        OffsetDateTime analyzedAt,
        List<SaveDetectedDefectRequest> defects
) {
}
