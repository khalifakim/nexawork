package com.nexawork.file.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.file.dtos.requests.UploadContextParams;
import com.nexawork.file.dtos.responses.PresignedUrlResponse;
import com.nexawork.file.dtos.responses.StoredFileResponse;
import com.nexawork.file.entities.StoredFile;
import com.nexawork.file.services.FileService;
import com.nexawork.file.services.MinioService;
import io.minio.GetObjectResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * File Service (§13.3). Upload multipart contextuel, métadonnées, URL présignée,
 * download proxifié (stream), suppression. Toutes les routes exigent une identité
 * (propagée par la Gateway).
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileController {

    FileService fileService;
    MinioService minioService;

    /**
     * Upload d'un fichier (multipart). {@code context} détermine le bucket cible
     * (400 si inconnu) ; les identifiants de contexte sont passés en query params.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Response<StoredFileResponse> upload(@RequestParam("context") String context,
                                               @RequestParam("file") MultipartFile file,
                                               UploadContextParams params) {
        return Response.<StoredFileResponse>created().setPayload(fileService.upload(context, file, params));
    }

    @GetMapping("/{id}")
    public Response<StoredFileResponse> metadata(@PathVariable UUID id) {
        return Response.<StoredFileResponse>ok().setPayload(fileService.getMetadata(id));
    }

    /**
     * Photo de profil — servie <b>en ligne</b> et <b>sans authentification</b>.
     *
     * <p>Un avatar s'affiche via une balise {@code <img src>}, et un navigateur
     * <b>n'y joint aucun en-tête {@code Authorization}</b> : passer par la route
     * protégée {@code /download} renvoyait donc un <b>401</b>, d'où l'image cassée
     * partout dans l'application. Cette route est publique (liste blanche Gateway).</p>
     *
     * <p><b>Elle ne peut pas servir n'importe quel fichier</b> : seuls les objets du
     * bucket des <i>avatars</i> sont acceptés — un identifiant de document GED ou de
     * pièce jointe y est refusé (404), sans révéler son existence. Une photo de profil
     * n'est de toute façon pas un secret : elle est visible de tout le workspace.</p>
     *
     * <p>{@code inline} (et non {@code attachment}) : sinon le navigateur téléchargerait
     * l'image au lieu de l'afficher.</p>
     */
    @GetMapping("/{id}/avatar")
    public ResponseEntity<InputStreamResource> avatar(@PathVariable UUID id) {
        StoredFile file = fileService.getAvatarEntity(id);
        GetObjectResponse stream = minioService.openStream(file.getBucket(), file.getObjectKey());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                // Les avatars changent rarement ; l'URL porte l'UUID du fichier, donc
                // une nouvelle photo = une nouvelle URL. Le cache est sûr.
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .body(new InputStreamResource(stream));
    }

    /** URL présignée MinIO (le client télécharge directement depuis MinIO). */
    @GetMapping("/{id}/url")
    public Response<PresignedUrlResponse> url(@PathVariable UUID id) {
        return Response.<PresignedUrlResponse>ok().setPayload(fileService.presignedUrl(id));
    }

    /** Download proxifié (stream via le backend) — utile si MinIO n'est pas joignable côté client. */
    @GetMapping("/{id}/download")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID id) throws IOException {
        StoredFile file = fileService.getEntity(id);
        GetObjectResponse stream = minioService.openStream(file.getBucket(), file.getObjectKey());

        String encodedName = UUID.randomUUID().toString();
        String filename = file.getOriginalName() != null ? file.getOriginalName() : encodedName;
        String contentDisposition = "attachment; filename=\"" + filename + "\"; filename*=UTF-8''"
                + java.net.URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .body(new InputStreamResource(stream));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        fileService.delete(id);
        return Response.deleted();
    }
}
