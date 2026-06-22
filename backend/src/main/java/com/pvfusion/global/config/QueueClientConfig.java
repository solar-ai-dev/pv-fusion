package com.pvfusion.global.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;


@Configuration
public class QueueClientConfig {

    @Bean
    @Profile("local")
    SqsClient localSqsClient(
            @Value("${queue.sqs.endpoint}") String endpoint,
            @Value("${queue.sqs.access-key}") String accessKey,
            @Value("${queue.sqs.secret-key}") String secretKey,
            @Value("${queue.sqs.region}") String region
    ) {
        return SqsClient.builder()
                .region(Region.of(region))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .build();
    }

    @Bean
    @Profile({"prod", "test"})
    SqsClient prodSqsClient(@Value("${queue.sqs.region}") String region) {
        return SqsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Bean("analysisJobQueueUrl")
    String analysisJobQueueUrl(@Value("${queue.sqs.queue-url}") String queueUrl) {
        return queueUrl;
    }
}
