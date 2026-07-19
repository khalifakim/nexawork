package com.nexawork.meeting.services;

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
 * Relais vers le File Service pour l'<b>invité externe</b> (M5).
 *
 * <p>Un invité n'a ni compte ni JWT : il ne peut pas appeler le File Service, dont
 * toutes les routes exigent une identité propagée par la Gateway. Le Meeting
 * Service, lui, sait valider son token d'invitation — il relaie donc les octets
 * pour son compte, en <b>forgeant les en-têtes d'identité</b> sur le réseau interne
 * (le File Service fait confiance à ces en-têtes, comme pour tout appel Gateway).</p>
 *
 * <p>L'identité forgée est celle de <b>l'hôte de la réunion</b> : c'est lui qui, en
 * invitant, engage sa responsabilité sur le fichier. On n'invente pas un utilisateur
 * qui n'existe pas — mais la <b>paternité réelle</b> du partage est conservée à part,
 * dans {@code MeetingFile.sharedByName} (et {@code sharedBy} reste nul pour un externe).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingFileClient {

    RestClient fileRestClient;

    /** Résultat de l'upload — le strict nécessaire à MeetingFile. */
    public record Stored(UUID id, String originalName, String contentType, Long size) {
    }

    /**
     * Téléverse le fichier au nom de l'invité (contexte {@code meeting-file} → MinIO).
     * {@code onBehalfOfUserId} = hôte de la réunion (voir la note de classe).
     */
    public Stored upload(MultipartFile file, UUID organisationId, UUID callId, UUID onBehalfOfUserId) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("context", "meeting-file");
        form.add("workspaceId", organisationId.toString());
        form.add("meetingId", callId.toString());
        form.add("file", asResource(file));

        Response<Map<String, Object>> response = fileRestClient.post()
                .uri("/api/v1/files")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .headers(h -> {
                    h.set("X-User-Id", onBehalfOfUserId.toString());
                    h.set("X-Org-Id", organisationId.toString());
                    h.set("X-Org-Role", "MEMBER");
                })
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
                size instanceof Number n ? n.longValue() : null);
    }

    /** Récupère les octets d'un fichier — l'invité ne peut pas les demander lui-même. */
    public byte[] download(UUID fileId, UUID organisationId, UUID onBehalfOfUserId) {
        return fileRestClient.get()
                .uri("/api/v1/files/{id}/download", fileId)
                .headers(h -> {
                    h.set("X-User-Id", onBehalfOfUserId.toString());
                    h.set("X-Org-Id", organisationId.toString());
                    h.set("X-Org-Role", "MEMBER");
                })
                .retrieve()
                .body(byte[].class);
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
