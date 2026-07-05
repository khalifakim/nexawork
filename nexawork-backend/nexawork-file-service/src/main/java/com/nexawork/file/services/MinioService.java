package com.nexawork.file.services;

import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.file.properties.MinioProperties;
import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.http.Method;
import io.minio.messages.Item;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;

/**
 * Accès bas niveau à MinIO : upload en streaming avec calcul SHA-256 à la volée,
 * download (stream), URL présignée, suppression d'objet et suppression en cascade
 * par préfixe (V5.1 §4.3, §5.3).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MinioService {

    MinioClient minioClient;
    MinioProperties properties;

    /** Résultat d'un upload : taille réelle écrite + empreinte SHA-256 hex. */
    public record UploadResult(long size, String sha256) {
    }

    /**
     * Écrit un objet dans MinIO en calculant le SHA-256 pendant le transfert
     * ({@link DigestInputStream}) — le fichier n'est jamais entièrement chargé en
     * mémoire. La taille peut être inconnue (-1) : MinIO découpe alors en parts.
     */
    public UploadResult upload(String bucket, String objectKey, InputStream inputStream,
                               long size, String contentType) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (DigestInputStream digestStream = new DigestInputStream(inputStream, digest)) {
                long partSize = size < 0 ? 10 * 1024 * 1024 : -1; // 10 Mo si taille inconnue
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectKey)
                        .stream(digestStream, size, partSize)
                        .contentType(contentType)
                        .build());
                String sha256 = HexFormat.of().formatHex(digest.digest());
                return new UploadResult(size, sha256);
            }
        } catch (Exception e) {
            log.error("Échec upload MinIO {}/{} : {}", bucket, objectKey, e.getMessage());
            throw new IllegalStateException("Échec du stockage du fichier.", e);
        }
    }

    /** Flux de lecture d'un objet (pour le download proxifié). */
    public GetObjectResponse openStream(String bucket, String objectKey) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket).object(objectKey).build());
        } catch (Exception e) {
            log.error("Objet MinIO introuvable {}/{} : {}", bucket, objectKey, e.getMessage());
            throw new ResourceNotFoundException("Objet de fichier introuvable dans le stockage.");
        }
    }

    /** URL présignée de téléchargement (GET), valable {@code presignedExpirySeconds}. */
    public String presignedGetUrl(String bucket, String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(objectKey)
                    .expiry(properties.getPresignedExpirySeconds(), TimeUnit.SECONDS)
                    .build());
        } catch (Exception e) {
            log.error("Échec génération URL présignée {}/{} : {}", bucket, objectKey, e.getMessage());
            throw new IllegalStateException("Impossible de générer l'URL de téléchargement.", e);
        }
    }

    /** Supprime un objet unique (best-effort — la suppression métier reste maître). */
    public void remove(String bucket, String objectKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket).object(objectKey).build());
        } catch (Exception e) {
            log.error("Échec suppression MinIO {}/{} : {}", bucket, objectKey, e.getMessage());
            throw new IllegalStateException("Échec de la suppression du fichier dans le stockage.", e);
        }
    }

    /**
     * Suppression en cascade de tous les objets sous un préfixe, sur un bucket
     * (ex. {@code workspaces/{wsId}/} lors de la suppression d'un workspace, §5.3).
     */
    public void removeByPrefix(String bucket, String prefix) {
        try {
            Iterable<Result<Item>> objects = minioClient.listObjects(ListObjectsArgs.builder()
                    .bucket(bucket).prefix(prefix).recursive(true).build());
            for (Result<Item> result : objects) {
                String key = result.get().objectName();
                minioClient.removeObject(RemoveObjectArgs.builder()
                        .bucket(bucket).object(key).build());
            }
        } catch (Exception e) {
            log.error("Échec suppression par préfixe {}/{} : {}", bucket, prefix, e.getMessage());
            throw new IllegalStateException("Échec de la suppression en cascade dans le stockage.", e);
        }
    }
}
