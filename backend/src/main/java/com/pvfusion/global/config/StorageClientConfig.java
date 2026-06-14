package com.pvfusion.global.config;

import java.net.URI;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;


@Configuration
public class StorageClientConfig {

    @Bean
    @Profile("local")
    S3Client localS3Client(
            @Value("${storage.minio.endpoint}") String endpoint,
            @Value("${storage.minio.access-key}") String accessKey,
            @Value("${storage.minio.secret-key}") String secretKey,
            @Value("${storage.minio.region}") String region,
            @Value("${storage.minio.path-style-access-enabled}") boolean pathStyleAccessEnabled
    ) {
        return S3Client.builder()
                .region(Region.of(region))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build())
                .build();
    }

    @Bean
    @Profile({"prod", "test"})
    S3Client prodS3Client(
            @Value("${storage.s3.region}") String region,
            @Value("${storage.s3.path-style-access-enabled}") boolean pathStyleAccessEnabled
    ) {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build())
                .build();
    }

    @Bean
    @Profile("local")
    S3Presigner localS3Presigner(
            @Value("${storage.minio.endpoint}") String endpoint,
            @Value("${storage.minio.access-key}") String accessKey,
            @Value("${storage.minio.secret-key}") String secretKey,
            @Value("${storage.minio.region}") String region,
            @Value("${storage.minio.path-style-access-enabled}") boolean pathStyleAccessEnabled
    ) {
        return S3Presigner.builder()
                .region(Region.of(region))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build())
                .build();
    }

    @Bean
    @Profile({"prod", "test"})
    S3Presigner prodS3Presigner(
            @Value("${storage.s3.region}") String region,
            @Value("${storage.s3.path-style-access-enabled}") boolean pathStyleAccessEnabled
    ) {
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccessEnabled)
                        .build())
                .build();
    }

    @Bean("storageBucketName")
    @Profile("local")
    String localStorageBucketName(@Value("${storage.minio.bucket-name}") String bucketName) {
        return bucketName;
    }

    @Bean("storageBucketName")
    @Profile({"prod", "test"})
    String prodStorageBucketName(@Value("${storage.s3.bucket-name}") String bucketName) {
        return bucketName;
    }

    @Bean("storagePresignDuration")
    Duration storagePresignDuration(@Value("${storage.presign-duration-seconds}") long seconds) {
        return seconds > 0 ? Duration.ofSeconds(seconds) : Duration.ofMinutes(15);
    }
}
