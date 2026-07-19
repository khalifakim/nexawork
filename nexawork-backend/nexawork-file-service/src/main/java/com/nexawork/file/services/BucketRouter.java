package com.nexawork.file.services;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.file.dtos.requests.UploadContextParams;
import com.nexawork.file.entities.enums.UploadContext;
import com.nexawork.file.properties.MinioProperties;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Traduit un contexte d'upload en couple {@code (bucket, objectKey)} selon le
 * modèle de stockage à 3 buckets (V5.1 §5.3). Isolation multi-tenant par prefix
 * {@code workspaces/{wsId}/} (sauf avatars, préfixés {@code users/{userId}/}).
 *
 * @param bucket    le bucket MinIO cible
 * @param objectKey le chemin complet de l'objet dans ce bucket
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BucketRouter {

    MinioProperties properties;

    public record Route(String bucket, String objectKey) {
    }

    /**
     * Calcule la destination. {@code fileId} est l'UUID pré-généré du StoredFile
     * (feuille de la clé). Les identifiants de contexte requis dépendent du
     * contexte (ex. wsId pour tout sauf avatar, msgId pour les messages).
     */
    public Route resolve(UploadContext context, UUID fileId, String extension, UploadContextParams p) {
        String ext = (extension != null && !extension.isBlank()) ? extension : "bin";
        return switch (context) {
            case AVATAR -> {
                UUID userId = require(p.getUserId(), "userId", context);
                // Versionné par le fileId (le versionHash de §5.3) — pas de préfixe workspace.
                yield new Route(properties.getBuckets().getUsers(),
                        "users/" + userId + "/avatar-" + fileId + "." + ext);
            }
            case CHANNEL_MSG -> {
                UUID ws = require(p.getWorkspaceId(), "workspaceId", context);
                UUID channelId = require(p.getChannelId(), "channelId", context);
                // messageId optionnel : la pièce jointe est téléversée AVANT la
                // création du message (son URL est fournie dans SendMessageRequest).
                // Le fileId suffit à l'unicité de la clé.
                String base = "workspaces/" + ws + "/channels/" + channelId + "/messages"
                        + (p.getMessageId() != null ? "/" + p.getMessageId() : "");
                yield new Route(properties.getBuckets().getMessaging(), base + "/" + fileId);
            }
            case CONVERSATION_MSG -> {
                UUID ws = require(p.getWorkspaceId(), "workspaceId", context);
                UUID convId = require(p.getConversationId(), "conversationId", context);
                // messageId optionnel (cf. CHANNEL_MSG) : upload avant l'envoi.
                String base = "workspaces/" + ws + "/conversations/" + convId + "/messages"
                        + (p.getMessageId() != null ? "/" + p.getMessageId() : "");
                yield new Route(properties.getBuckets().getMessaging(), base + "/" + fileId);
            }
            case GED -> {
                UUID ws = require(p.getWorkspaceId(), "workspaceId", context);
                // GED workspace ou GED projet selon la présence de projectId.
                String base = p.getProjectId() != null
                        ? "workspaces/" + ws + "/projects/" + p.getProjectId() + "/ged"
                        : "workspaces/" + ws + "/ged";
                yield new Route(properties.getBuckets().getDocuments(), base + "/" + fileId);
            }
            case TASK_ATTACHMENT -> {
                UUID ws = require(p.getWorkspaceId(), "workspaceId", context);
                UUID projId = require(p.getProjectId(), "projectId", context);
                UUID taskId = require(p.getTaskId(), "taskId", context);
                yield new Route(properties.getBuckets().getDocuments(),
                        "workspaces/" + ws + "/projects/" + projId + "/tasks/" + taskId + "/" + fileId);
            }
            case MEETING_FILE -> {
                UUID ws = require(p.getWorkspaceId(), "workspaceId", context);
                UUID meetingId = require(p.getMeetingId(), "meetingId", context);
                // Bucket `documents` : un fichier de réunion est un livrable durable,
                // consultable dans l'historique bien après la fin de l'appel.
                yield new Route(properties.getBuckets().getDocuments(),
                        "workspaces/" + ws + "/meetings/" + meetingId + "/" + fileId);
            }
        };
    }

    private UUID require(UUID value, String name, UploadContext context) {
        if (value == null) {
            throw new InvalidRequestException(
                    "Le paramètre « " + name + " » est requis pour le contexte « " + context.getWireValue() + " ».");
        }
        return value;
    }
}
