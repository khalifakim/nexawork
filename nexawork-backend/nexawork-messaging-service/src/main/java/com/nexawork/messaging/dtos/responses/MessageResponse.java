package com.nexawork.messaging.dtos.responses;

import com.nexawork.messaging.entities.enums.MessageType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Message (§13.5, §7.5). Diffusé tel quel sur WebSocket (Lot 7C). {@code readAt}
 * n'est renseigné que pour les conversations directes (indicateur ✓✓).
 */
@Data
@Builder
public class MessageResponse {

    private UUID id;
    private UUID channelId;
    private UUID conversationId;
    private UUID senderUserId;
    private String content;
    /** Pièces jointes du message (0..N) — V2. */
    private List<MessageAttachmentResponse> attachments;
    /** @deprecated forme mono-pièce héritée (anciens messages). */
    @Deprecated
    private String attachmentUrl;
    /** @deprecated cf. {@link #attachmentUrl}. */
    @Deprecated
    private String attachmentName;
    private MessageType messageType;
    private Boolean edited;
    /** Aperçu du message cité (réponse ciblée). Nul = message ordinaire. */
    private ReplyPreview replyTo;
    /** Message supprimé (soft delete) : diffusé à {@code true} pour que les clients
     *  connectés le retirent en temps réel. Les rechargements l'excluent déjà. */
    private Boolean isDeleted;
    private LocalDateTime sentAt;
    private Instant readAt;
    private List<MentionResponse> mentions;
    /** Réactions emoji agrégées. `userIds` permet à chaque client de savoir s'il a réagi. */
    private List<ReactionSummary> reactions;

    /** Extrait du message cité, résolu à l'affichage (auteur + court aperçu). */
    @Data
    @Builder
    public static class ReplyPreview {
        private UUID id;
        private UUID authorUserId;
        private String excerpt;
        /** Le message cité a été supprimé entre-temps. */
        private boolean deleted;
    }

    /** Un emoji + qui l'a posé. Le client dérive le total et son propre « réagi ». */
    @Data
    @Builder
    public static class ReactionSummary {
        private String emoji;
        private List<UUID> userIds;
    }
}
