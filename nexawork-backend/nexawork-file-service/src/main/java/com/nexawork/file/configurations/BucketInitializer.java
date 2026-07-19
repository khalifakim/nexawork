package com.nexawork.file.configurations;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import com.nexawork.file.properties.MinioProperties;
import jakarta.annotation.PostConstruct;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Crée les buckets MinIO au démarrage s'ils n'existent pas.
 *
 * <p>Le File Service ne doit PAS dépendre d'un sidecar externe (`minio-init`) pour
 * fonctionner : sur un MinIO reparti à vide (volume neuf) sans ce script, le
 * premier upload échouait en <b>500</b> — le bucket cible n'existait pas. Le service
 * garantit désormais lui-même la présence de ses trois buckets, quel que soit
 * l'état de MinIO. Idempotent : un bucket déjà là est laissé tel quel.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BucketInitializer {

    MinioClient minioClient;
    MinioProperties properties;

    @PostConstruct
    void ensureBuckets() {
        MinioProperties.Buckets b = properties.getBuckets();
        for (String bucket : List.of(b.getDocuments(), b.getMessaging(), b.getUsers())) {
            if (bucket == null || bucket.isBlank()) {
                continue;
            }
            try {
                boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
                if (!exists) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                    log.info("Bucket MinIO « {} » créé.", bucket);
                } else {
                    log.debug("Bucket MinIO « {} » déjà présent.", bucket);
                }
            } catch (Exception e) {
                // On ne bloque pas le démarrage : MinIO peut n'être pas encore prêt.
                // L'upload retentera, et le bucket sera créé au prochain démarrage.
                log.warn("Bucket MinIO « {} » non vérifié au démarrage : {}", bucket, e.getMessage());
            }
        }
    }
}
