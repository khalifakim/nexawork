package com.nexawork.ged.services;

import com.nexawork.commons.exceptions.ServiceUnavailableException;
import com.nexawork.ged.security.CallerContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Appel HTTP synchrone GED → Project pour le contenu du dossier virtuel
 * « Pièces jointes aux tâches » (V5.1 §10.5bis, §7.1 : exception unique et
 * délibérée au découplage événementiel). Propage l'identité de l'appelant
 * (headers Gateway) pour que le R15 du Project Service s'applique.
 *
 * <p>Toute défaillance (timeout, connexion, non-2xx) devient une
 * {@link ServiceUnavailableException} → 503 : le GED préfère une erreur explicite
 * à un contenu partiel ou périmé.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectTaskAttachmentClient {

    RestClient projectRestClient;
    CallerContext caller;

    /** Item de l'agrégat renvoyé par {@code GET /projects/{id}/task-attachments}. */
    public record ProjectTaskAttachment(
            UUID attachmentId,
            UUID taskId,
            String taskTitle,
            String fileName,
            String fileUrl,
            Long fileSize,
            String contentType,
            UUID uploadedByUserId,
            LocalDateTime uploadedAt) {
    }

    /** Enveloppe {@code Response<List<…>>} de commons (on ne lit que le payload). */
    private record ResponseWrapper(String status, List<ProjectTaskAttachment> payload) {
    }

    public List<ProjectTaskAttachment> fetchForProject(UUID projectId) {
        try {
            ResponseWrapper body = projectRestClient.get()
                    .uri("/api/v1/projects/{id}/task-attachments", projectId)
                    .headers(headers -> {
                        headers.set("X-User-Id", caller.userId().toString());
                        caller.organisationIdOptional().ifPresent(org -> headers.set("X-Org-Id", org.toString()));
                        if (caller.orgRole() != null) {
                            headers.set("X-Org-Role", caller.orgRole());
                        }
                    })
                    .retrieve()
                    .body(new ParameterizedTypeReference<ResponseWrapper>() {});
            return body != null && body.payload() != null ? body.payload() : List.of();
        } catch (Exception e) {
            log.error("Appel synchrone GED → Project (task-attachments projet {}) échoué : {}",
                    projectId, e.getMessage());
            throw new ServiceUnavailableException(
                    "Le contenu du dossier « Pièces jointes aux tâches » est momentanément indisponible "
                    + "(Project Service injoignable). Réessayez plus tard.");
        }
    }
}
