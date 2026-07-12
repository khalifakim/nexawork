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
    private LocalDateTime sentAt;
    private Instant readAt;
    private List<MentionResponse> mentions;
}
