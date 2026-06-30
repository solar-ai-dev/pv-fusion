package com.pvfusion.adapter.out.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.image.ImageAccessUrlRequest;
import com.pvfusion.application.dto.image.ImageStorageRequest;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@ExtendWith(MockitoExtension.class)
class S3ImageStorageAdapterTest {

    @Mock
    private S3Client s3Client;
    @Mock
    private S3Presigner s3Presigner;
    @Mock
    private PresignedGetObjectRequest presignedGetObjectRequest;

    @Test
    void storeUploadsBytesToS3() {
        S3ImageStorageAdapter adapter = new S3ImageStorageAdapter(
                s3Client,
                s3Presigner,
                "bucket",
                Duration.ofMinutes(15)
        );
        ImageStorageRequest request = new ImageStorageRequest(
                10L,
                null,
                ImageType.RGB,
                TargetType.ZONE,
                "rgb.jpg",
                "image/jpeg",
                "rgb.jpg",
                new byte[]{1, 2, 3}
        );

        when(s3Client.putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        var result = adapter.store(request);

        verify(s3Client).putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class));
        assertThat(result.bucketName()).isEqualTo("bucket");
        assertThat(result.objectKey()).contains("inspections/10/");
    }

    @Test
    void generateReturnsPresignedUrl() throws Exception {
        S3ImageStorageAdapter adapter = new S3ImageStorageAdapter(
                s3Client,
                s3Presigner,
                "bucket",
                Duration.ofMinutes(15)
        );

        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedGetObjectRequest);
        when(presignedGetObjectRequest.url()).thenReturn(URI.create("https://example.com/image").toURL());
        when(presignedGetObjectRequest.expiration()).thenReturn(Instant.parse("2026-06-05T01:00:00Z"));

        var result = adapter.generate(new ImageAccessUrlRequest("bucket", "object-key"));

        assertThat(result.accessUrl()).isEqualTo("https://example.com/image");
        assertThat(result.expiresAt()).isNotNull();
    }
}
