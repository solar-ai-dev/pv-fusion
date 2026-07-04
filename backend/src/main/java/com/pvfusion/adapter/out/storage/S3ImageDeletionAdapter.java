package com.pvfusion.adapter.out.storage;

import com.pvfusion.application.dto.deletion.StoredFileReference;
import com.pvfusion.application.port.out.deletion.DeleteStoredFilePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@Component
@RequiredArgsConstructor
public class S3ImageDeletionAdapter implements DeleteStoredFilePort {

    private final S3Client s3Client;

    @Override
    public void delete(StoredFileReference fileReference) {
        if (fileReference == null || fileReference.bucketName() == null || fileReference.bucketName().isBlank()
                || fileReference.objectKey() == null || fileReference.objectKey().isBlank()) {
            return;
        }

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(fileReference.bucketName())
                    .key(fileReference.objectKey())
                    .build());
        } catch (NoSuchKeyException ignored) {
            // 이미 정리된 파일은 무시한다.
        }
    }
}
