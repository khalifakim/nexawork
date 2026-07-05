package com.nexawork.file.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Bloc YAML {@code nexawork.minio} du config-repo (V5.1 §5.3) : connexion MinIO +
 * les 3 buckets par domaine fonctionnel connus du service.
 */
@Data
@Validated
@ConfigurationProperties(prefix = "nexawork.minio")
public class MinioProperties {

    private String url;
    private String accessKey;
    private String secretKey;

    /** Durée de validité des URLs présignées de téléchargement (secondes). */
    private int presignedExpirySeconds = 900;

    private Buckets buckets = new Buckets();

    /** Les 3 buckets par domaine (V5.1 §5.3). */
    @Data
    public static class Buckets {
        private String documents;
        private String messaging;
        private String users;
    }
}
