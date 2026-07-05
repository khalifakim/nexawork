package com.nexawork.file.configurations;

import com.nexawork.file.properties.MinioProperties;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Client MinIO (S3-compatible) construit depuis {@link MinioProperties}
 * (config-repo {@code nexawork.minio}). Les 3 buckets sont créés en amont par le
 * sidecar {@code minio-init} (Phase 0) — ce service ne les crée pas.
 */
@Configuration
@RequiredArgsConstructor
public class MinioConfiguration {

    private final MinioProperties properties;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(properties.getUrl())
                .credentials(properties.getAccessKey(), properties.getSecretKey())
                .build();
    }
}
