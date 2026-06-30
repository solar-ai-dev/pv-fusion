package com.pvfusion.global.util;

import java.util.UUID;

public final class ObjectKeyGenerator {

    private ObjectKeyGenerator() {
    }

    public static String generateOriginalRgbImageKey(Long inspectionId, Long imageId, String extension) {
        return generateOriginalImageKey(inspectionId, "rgb", imageId, extension);
    }

    public static String generateOriginalThermalImageKey(Long inspectionId, Long imageId, String extension) {
        return generateOriginalImageKey(inspectionId, "thermal", imageId, extension);
    }

    public static String generateResultBboxKey(Long jobId, Long resultId, String extension) {
        return generateResultKey(jobId, "bbox", resultId, extension);
    }

    public static String generateResultHeatmapKey(Long jobId, Long resultId, String extension) {
        return generateResultKey(jobId, "heatmap", resultId, extension);
    }

    public static String generateResultMaskKey(Long jobId, Long resultId, String extension) {
        return generateResultKey(jobId, "mask", resultId, extension);
    }

    public static String generateTempUploadKey(String extension) {
        return "temp/uploads/" + UUID.randomUUID() + withExtension(extension);
    }

    public static String generateTempAnalysisKey(Long jobId, String extension) {
        requirePositive(jobId, "jobId");
        return "temp/analysis/" + jobId + "/" + UUID.randomUUID() + withExtension(extension);
    }

    private static String generateOriginalImageKey(
            Long inspectionId,
            String imageTypeSegment,
            Long imageId,
            String extension
    ) {
        requirePositive(inspectionId, "inspectionId");
        requirePositive(imageId, "imageId");
        return "originals/inspections/" + inspectionId + "/" + imageTypeSegment + "/" + imageId + "_" + UUID.randomUUID() + withExtension(extension);
    }

    private static String generateResultKey(
            Long jobId,
            String resultTypeSegment,
            Long resultId,
            String extension
    ) {
        requirePositive(jobId, "jobId");
        requirePositive(resultId, "resultId");
        return "results/analysis-jobs/" + jobId + "/" + resultTypeSegment + "/" + resultId + "_" + UUID.randomUUID() + withExtension(extension);
    }

    private static void requirePositive(Long value, String fieldName) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be a positive value.");
        }
    }

    private static String withExtension(String extension) {
        String normalized = FileNameUtils.normalizeExtension(extension);
        return normalized.isBlank() ? "" : "." + normalized;
    }
}
