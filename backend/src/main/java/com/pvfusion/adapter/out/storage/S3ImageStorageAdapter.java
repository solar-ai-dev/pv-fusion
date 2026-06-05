package com.pvfusion.adapter.out.storage;

import com.pvfusion.application.dto.image.ImageAccessUrlRequest;
import com.pvfusion.application.dto.image.ImageAccessUrlResult;
import com.pvfusion.application.dto.image.ImageStorageRequest;
import com.pvfusion.application.dto.image.ImageStorageResult;
import com.pvfusion.application.port.out.image.GenerateImageAccessUrlPort;
import com.pvfusion.application.port.out.image.StoreImageFilePort;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.net.URI;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
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
            @Value("${storage.provider:minio}") String provider,
            @Value("${storage.minio.endpoint:}") String minioEndpoint,
            @Value("${storage.minio.access-key:}") String minioAccessKey,
            @Value("${storage.minio.secret-key:}") String minioSecretKey,
            @Value("${storage.minio.bucket-name:}") String minioBucketName,
            @Value("${storage.minio.region:ap-northeast-2}") String minioRegion,
            @Value("${storage.minio.path-style-access-enabled:true}") boolean minioPathStyleAccessEnabled,
            @Value("${storage.s3.endpoint:}") String s3Endpoint,
            @Value("${storage.s3.access-key:}") String s3AccessKey,
            @Value("${storage.s3.secret-key:}") String s3SecretKey,
            @Value("${storage.s3.bucket-name:}") String s3BucketName,
            @Value("${storage.s3.region:${AWS_REGION:ap-northeast-2}}") String s3Region,
            @Value("${storage.s3.path-style-access-enabled:false}") boolean s3PathStyleAccessEnabled,
            @Value("${storage.presign-duration-seconds:900}") long presignDurationSeconds
    ) {
        boolean minio = "minio".equalsIgnoreCase(provider);
        String endpoint = minio ? minioEndpoint : s3Endpoint;
        String accessKey = minio ? minioAccessKey : s3AccessKey;
        String secretKey = minio ? minioSecretKey : s3SecretKey;
        String region = minio ? minioRegion : s3Region;
        boolean pathStyleAccessEnabled = minio ? minioPathStyleAccessEnabled : s3PathStyleAccessEnabled;

        this.s3Client = buildS3Client(endpoint, accessKey, secretKey, region, pathStyleAccessEnabled);
        this.s3Presigner = buildS3Presigner(endpoint, accessKey, secretKey, region, pathStyleAccessEnabled);
        this.bucketName = minio ? minioBucketName : s3BucketName;
        this.presignDuration = presignDurationSeconds > 0
                ? Duration.ofSeconds(presignDurationSeconds)
                : DEFAULT_PRESIGN_DURATION;
    }

    S3ImageStorageAdapter(
            S3Client s3Client,
            S3Presigner s3Presigner,
            String bucketName,
            Duration presignDuration
    ) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
        this.presignDuration = presignDuration;
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

    private static S3Client buildS3Client(
            String endpoint,
            String accessKey,
            String secretKey,
            String region,
            boolean pathStyleAccessEnabled
    ) {
        var builder = S3Client.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build());

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }

        if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)
            ));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }

    private static S3Presigner buildS3Presigner(
            String endpoint,
            String accessKey,
            String secretKey,
            String region,
            boolean pathStyleAccessEnabled
    ) {
        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build());

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }

        if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)
            ));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }
}
