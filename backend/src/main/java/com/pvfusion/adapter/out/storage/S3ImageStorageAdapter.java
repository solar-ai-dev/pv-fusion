package com.pvfusion.adapter.out.storage;

import com.pvfusion.application.dto.image.ImageAccessUrlRequest;
import com.pvfusion.application.dto.image.ImageAccessUrlResult;
import com.pvfusion.application.dto.image.ImageStorageRequest;
import com.pvfusion.application.dto.image.ImageStorageResult;
import com.pvfusion.application.port.out.image.GenerateImageAccessUrlPort;
import com.pvfusion.application.port.out.image.StoreImageFilePort;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Component
public class S3ImageStorageAdapter implements StoreImageFilePort, GenerateImageAccessUrlPort {

    private static final Duration DEFAULT_PRESIGN_DURATION = Duration.ofMinutes(15);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final Duration presignDuration;

    @Autowired
    public S3ImageStorageAdapter(
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Qualifier("storageBucketName") String bucketName,
            @Qualifier("storagePresignDuration") Duration presignDuration
    ) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
        this.presignDuration = presignDuration != null ? presignDuration : DEFAULT_PRESIGN_DURATION;
    }
    @Override
    public ImageStorageResult store(ImageStorageRequest request) {
        validateBucketName();
        try {
            String objectKey = createObjectKey(request);
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(request.mimeType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(request.fileContent()));
            return new ImageStorageResult(bucketName, objectKey, null);
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.FILE_STORAGE_FAILED, "Failed to store image file.");
        }
    }

    @Override
    public ImageAccessUrlResult generate(ImageAccessUrlRequest request) {
        validateBucketName();
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(request.bucketName())
                    .key(request.objectKey())
                    .build();
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(presignDuration)
                    .getObjectRequest(getObjectRequest)
                    .build();

            var presignedRequest = s3Presigner.presignGetObject(presignRequest);
            return new ImageAccessUrlResult(
                    presignedRequest.url().toString(),
                    OffsetDateTime.ofInstant(presignedRequest.expiration(), ZoneOffset.UTC)
            );
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.FILE_STORAGE_FAILED, "Failed to generate image access URL.");
        }
    }

    private void validateBucketName() {
        if (bucketName == null || bucketName.isBlank()) {
            throw new BusinessException(ErrorCode.FILE_STORAGE_FAILED, "Storage bucket is not configured.");
        }
    }

    private String createObjectKey(ImageStorageRequest request) {
        String extension = extractExtension(request.originalFilename());
        String targetSegment = request.targetType().name().toLowerCase();
        String imageTypeSegment = request.imageType().name().toLowerCase();
        String equipmentSegment = request.imageId() != null ? String.valueOf(request.imageId()) : "raw";
        return "inspections/%d/%s/%s/%s-%s%s".formatted(
                request.inspectionId(),
                targetSegment,
                imageTypeSegment,
                equipmentSegment,
                UUID.randomUUID(),
                extension
        );
    }

    private String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int index = filename.lastIndexOf('.');
        return index >= 0 ? filename.substring(index) : "";
    }
}
