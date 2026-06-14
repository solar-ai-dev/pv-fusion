package com.pvfusion.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

class DeploymentConfigContractTest {

    @Test
    void localProfileUsesMinioLocalstackAndPostgresVariables() {
        Properties base = loadYaml("application.yml");
        Properties local = loadYaml("application-local.yml");

        assertThat(local.getProperty("storage.minio.endpoint")).isEqualTo("${MINIO_ENDPOINT:http://localhost:9000}");
        assertThat(local.getProperty("storage.minio.access-key"))
                .isEqualTo("${MINIO_ROOT_USER:change_me_minio_root_user}");
        assertThat(local.getProperty("storage.minio.secret-key"))
                .isEqualTo("${MINIO_ROOT_PASSWORD:change_me_minio_root_password}");
        assertThat(base.getProperty("storage.minio.path-style-access-enabled")).isEqualTo("true");

        assertThat(local.getProperty("queue.sqs.endpoint")).isEqualTo("${SQS_ENDPOINT:http://localhost:4566}");
        assertThat(local.getProperty("queue.sqs.access-key")).isEqualTo("${SQS_ACCESS_KEY:test}");
        assertThat(local.getProperty("queue.sqs.secret-key")).isEqualTo("${SQS_SECRET_KEY:test}");
        assertThat(local.getProperty("queue.sqs.queue-url"))
                .isEqualTo("${SQS_QUEUE_URL:http://localhost:4566/000000000000/analysis-job-queue}");

        assertThat(local.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://${POSTGRES_HOST:localhost}:${POSTGRES_PORT:5432}/${POSTGRES_DB:pv_fusion_local}");
        assertThat(local.getProperty("spring.datasource.username")).isEqualTo("${POSTGRES_USER:pvfusion}");
        assertThat(local.getProperty("spring.datasource.password"))
                .isEqualTo("${POSTGRES_PASSWORD:change_me_postgres_password}");

        assertThat(local.getProperty("app.frontend.base-url")).isEqualTo("${FRONTEND_BASE_URL:http://localhost:5173}");
        assertThat(local.getProperty("app.cors.allowed-origins"))
                .isEqualTo("${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:5174,http://localhost:5175}");
    }

    @Test
    void prodProfileKeepsAwsOverridesOptionalAndUsesEnvironmentDrivenDatasource() {
        Properties base = loadYaml("application.yml");
        Properties prod = loadYaml("application-prod.yml");

        assertThat(prod.getProperty("storage.s3.bucket-name")).isEqualTo("${S3_BUCKET_NAME}");
        assertThat(base.getProperty("storage.s3.path-style-access-enabled")).isEqualTo("false");
        assertThat(prod.getProperty("storage.s3.endpoint")).isNull();
        assertThat(prod.getProperty("storage.s3.access-key")).isNull();
        assertThat(prod.getProperty("storage.s3.secret-key")).isNull();

        assertThat(prod.getProperty("queue.sqs.queue-url")).isEqualTo("${SQS_QUEUE_URL}");
        assertThat(prod.getProperty("queue.sqs.endpoint")).isNull();
        assertThat(prod.getProperty("queue.sqs.access-key")).isNull();
        assertThat(prod.getProperty("queue.sqs.secret-key")).isNull();

        assertThat(prod.getProperty("spring.datasource.url")).isEqualTo("${RDS_JDBC_URL}");
        assertThat(prod.getProperty("spring.datasource.username")).isEqualTo("${RDS_USERNAME}");
        assertThat(prod.getProperty("spring.datasource.password")).isEqualTo("${RDS_PASSWORD}");
        assertThat(prod.getProperty("app.frontend.base-url")).isEqualTo("${FRONTEND_BASE_URL}");
        assertThat(prod.getProperty("app.cors.allowed-origins")).isEqualTo("${CORS_ALLOWED_ORIGINS}");
    }

    private static Properties loadYaml(String path) {
        YamlPropertiesFactoryBean factory = new YamlPropertiesFactoryBean();
        factory.setResources(new ClassPathResource(path));
        factory.afterPropertiesSet();
        return factory.getObject();
    }
}
