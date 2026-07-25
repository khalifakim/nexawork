package com.nexawork.ged.services;

import com.nexawork.commons.models.Response;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * Relais vers le File Service pour un <b>visiteur externe sans compte</b> (Brique 4).
 *
 * <p>Le visiteur présente un token de lien de partage — jamais un JWT. Le GED valide
 * ce token puis relaie les octets vers/depuis le File Service en <b>forgeant les
 * en-têtes d'identité</b> du réseau interne. L'identité forgée est celle du
 * <b>créateur du lien</b> : c'est lui qui engage sa responsabilité en partageant.
 * La paternité réelle d'un dépôt externe est conservée à part (nom/email déclarés
 * sur le {@code GedFile}).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedFileClient {

    RestClient fileRestClient;

    /** Résultat d'upload — le strict nécessaire à la création du GedFile. */
    public record Stored(UUID id, String originalName, String contentType, Long size, String downloadUrl) {
    }

    /**
     * Téléverse un fichier déposé par un externe (contexte {@code ged-document} → MinIO),
     * au nom du créateur du lien. {@code organisationId} borne le scope.
     */
    public Stored upload(MultipartFile file, UUID organisationId, UUID onBehalfOfUserId, UUID projectId) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("context", "ged");
        form.add("workspaceId", organisationId.toString());
        if (projectId != null) {
            form.add("projectId", projectId.toString());
        }
        form.add("file", asResource(file));

        Response<Map<String, Object>> response = fileRestClient.post()
                .uri("/api/v1/files")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .headers(h -> forgeIdentity(h, organisationId, onBehalfOfUserId))
                .body(form)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });

        Map<String, Object> payload = response != null ? response.getPayload() : null;
        if (payload == null || payload.get("id") == null) {
            throw new IllegalStateException("Le File Service n'a pas renvoyé de fichier stocké.");
        }
        Object size = payload.get("size");
        return new Stored(
                UUID.fromString(payload.get("id").toString()),
                (String) payload.get("originalName"),
                (String) payload.get("contentType"),
                size instanceof Number n ? n.longValue() : null,
                (String) payload.get("downloadUrl"));
    }

    /** Récupère les octets d'un fichier — le visiteur ne peut pas les demander lui-même. */
    public byte[] download(UUID sourceFileId, UUID organisationId, UUID onBehalfOfUserId) {
        return fileRestClient.get()
                .uri("/api/v1/files/{id}/download", sourceFileId)
                .headers(h -> forgeIdentity(h, organisationId, onBehalfOfUserId))
                .retrieve()
                .body(byte[].class);
    }

    private void forgeIdentity(org.springframework.http.HttpHeaders h, UUID organisationId, UUID onBehalfOfUserId) {
        h.set("X-User-Id", onBehalfOfUserId.toString());
        h.set("X-Org-Id", organisationId.toString());
        h.set("X-Org-Role", "MEMBER");
    }

    /**
     * Le multipart entrant doit être re-matérialisé : son flux est lié à la requête
     * en cours et ne survivrait pas au second appel HTTP.
     */
    private ByteArrayResource asResource(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "fichier";
            return new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return name;
                }
            };
        } catch (IOException e) {
            throw new IllegalStateException("Fichier illisible.", e);
        }
    }
}
