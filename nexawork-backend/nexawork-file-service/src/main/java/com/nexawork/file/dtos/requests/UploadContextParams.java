package com.nexawork.file.dtos.requests;

import lombok.Data;

import java.util.UUID;

/**
 * Paramètres de contexte d'upload (query string). Le {@code context} est
 * obligatoire ; les identifiants requis dépendent du contexte (voir
 * {@link com.nexawork.file.services.BucketRouter}). {@code workspaceId} est en
 * pratique déduit du header {@code X-Org-Id} s'il n'est pas fourni explicitement.
 */
@Data
public class UploadContextParams {

    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private UUID userId;
    private UUID channelId;
    private UUID conversationId;
    private UUID messageId;
    private UUID meetingId;
}
