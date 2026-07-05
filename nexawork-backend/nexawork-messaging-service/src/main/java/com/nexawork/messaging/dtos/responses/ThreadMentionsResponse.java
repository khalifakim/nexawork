package com.nexawork.messaging.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Mentions d'un fil groupées par type (§13.5 — {@code GET /threads/{id}/mentions},
 * panneau « Éléments mentionnés » §12.4.2).
 */
@Data
@Builder
public class ThreadMentionsResponse {

    private List<MentionEntry> users;
    private List<MentionEntry> tasks;
    private List<MentionEntry> documents;
    private List<MentionEntry> channels;

    @Data
    @Builder
    public static class MentionEntry {
        private UUID targetId;
        private String targetText;
        private UUID messageId;
        private LocalDateTime sentAt;
    }
}
