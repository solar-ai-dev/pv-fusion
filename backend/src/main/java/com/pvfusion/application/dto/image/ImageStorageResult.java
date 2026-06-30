package com.pvfusion.application.dto.image;

public record ImageStorageResult(
        String bucketName,
        String objectKey,
        String fileUrl
) {
}
