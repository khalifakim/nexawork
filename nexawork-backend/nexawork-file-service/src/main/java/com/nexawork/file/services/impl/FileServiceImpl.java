package com.nexawork.file.services.impl;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.file.dtos.requests.UploadContextParams;
import com.nexawork.file.dtos.responses.PresignedUrlResponse;
import com.nexawork.file.dtos.responses.StoredFileResponse;
import com.nexawork.file.entities.StoredFile;
import com.nexawork.file.entities.enums.UploadContext;
import com.nexawork.file.mappers.StoredFileMapper;
import com.nexawork.file.properties.MinioProperties;
import com.nexawork.file.repositories.StoredFileRepository;
import com.nexawork.file.security.CallerContext;
import com.nexawork.file.services.BucketRouter;
import com.nexawork.file.services.FileService;
import com.nexawork.file.services.MinioService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

/**
 * Implémentation de l'orchestration de stockage (§13.3, §5.3).
 *
 * <p>Upload : (1) résout le contexte → 400 si inconnu ; (2) pré-génère l'UUID du
 * StoredFile (feuille de clé) ; (3) route vers (bucket, objectKey) ; (4) PUT MinIO
 * en streaming avec SHA-256 ; (5) INSERT metadata. Le workspace du header
 * {@code X-Org-Id} sert de défaut si {@code workspaceId} n'est pas fourni.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileServiceImpl implements FileService {

    StoredFileRepository repository;
    StoredFileMapper mapper;
    BucketRouter bucketRouter;
    MinioService minioService;
    MinioProperties properties;
    CallerContext caller;

    @Override
    @Transactional
    public StoredFileResponse upload(String context, MultipartFile file, UploadContextParams params) {
        UploadContext ctx = UploadContext.fromWire(context)
                .orElseThrow(() -> new InvalidRequestException(
                        "Contexte d'upload inconnu : « " + context + " »."));
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("Aucun fichier fourni.");
        }

        // Défauts d'identité depuis les headers Gateway.
        if (params.getWorkspaceId() == null) {
            caller.organisationId().ifPresent(params::setWorkspaceId);
        }
        if (ctx == UploadContext.AVATAR && params.getUserId() == null) {
            params.setUserId(caller.userId());
        }

        UUID fileId = UUID.randomUUID();
        String extension = extensionOf(file.getOriginalFilename());
        BucketRouter.Route route = bucketRouter.resolve(ctx, fileId, extension, params);

        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType() : "application/octet-stream";

        MinioService.UploadResult result;
        try (InputStream in = file.getInputStream()) {
            result = minioService.upload(route.bucket(), route.objectKey(), in, file.getSize(), contentType);
        } catch (IOException e) {
            throw new IllegalStateException("Lecture du fichier uploadé impossible.", e);
        }

        StoredFile stored = repository.save(StoredFile.builder()
                .id(fileId)
                .originalName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "fichier")
                .storedName(fileId + (extension.isBlank() ? "" : "." + extension))
                .bucket(route.bucket())
                .objectKey(route.objectKey())
                .contentType(contentType)
                .size(result.size() >= 0 ? result.size() : file.getSize())
                .sha256(result.sha256())
                .uploadedByUserId(caller.userId())
                .organisationId(params.getWorkspaceId())
                .projectId(params.getProjectId())
                .taskId(params.getTaskId())
                .build());

        log.info("Fichier {} stocké dans {}/{} (sha256={})",
                stored.getId(), route.bucket(), route.objectKey(), result.sha256());
        return mapper.asDto(stored);
    }

    @Override
    @Transactional(readOnly = true)
    public StoredFileResponse getMetadata(UUID id) {
        return mapper.asDto(getEntity(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PresignedUrlResponse presignedUrl(UUID id) {
        StoredFile file = getEntity(id);
        String url = minioService.presignedGetUrl(file.getBucket(), file.getObjectKey());
        return PresignedUrlResponse.builder()
                .url(url)
                .expiresInSeconds(properties.getPresignedExpirySeconds())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StoredFile getEntity(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
    }

    /**
     * Garde de la route publique des avatars. Le bucket fait foi : seuls les objets
     * du bucket `users` (contexte `avatar`) sortent. Un identifiant de document GED
     * ou de pièce jointe est refusé en **404** — on ne révèle pas son existence.
     */
    @Override
    @Transactional(readOnly = true)
    public StoredFile getAvatarEntity(UUID id) {
        StoredFile file = getEntity(id);
        if (!properties.getBuckets().getUsers().equals(file.getBucket())) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        return file;
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        StoredFile file = getEntity(id);
        // Hard delete (V5.1 §4.3 : pas de soft-delete) : objet MinIO + ligne.
        minioService.remove(file.getBucket(), file.getObjectKey());
        repository.delete(file);
        log.info("Fichier {} supprimé ({}/{})", id, file.getBucket(), file.getObjectKey());
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return (dot >= 0 && dot < filename.length() - 1) ? filename.substring(dot + 1) : "";
    }
}
