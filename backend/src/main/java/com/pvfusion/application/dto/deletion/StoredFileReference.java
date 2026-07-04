package com.pvfusion.application.dto.deletion;

public record StoredFileReference(
        String bucketName,
        String objectKey
) {
}
