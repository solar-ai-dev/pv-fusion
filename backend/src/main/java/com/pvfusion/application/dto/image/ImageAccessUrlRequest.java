package com.pvfusion.application.dto.image;

public record ImageAccessUrlRequest(
        String bucketName,
        String objectKey
) {
}
