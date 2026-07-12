package com.nexawork.meeting.dtos.responses;

import com.nexawork.meeting.entities.enums.CallStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Appel (§13.6). {@code jitsiUrl} + {@code jwt} ne sont renseignés que lors de la
 * création / du join (le token JaaS n'est pas re-servi sur les listes).
 */
@Data
@Builder
public class CallResponse {

    private UUID id;
    private String topic;
    private String roomName;
    private UUID organisationId;
    private UUID hostUserId;
    private CallStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
    private List<ParticipantSummary> participants;

    /** URL de salle JaaS assemblée (§9.9.5) — présente à create/join uniquement. */
    private String jitsiUrl;
    /** Token JaaS RS256 — présent à create/join uniquement. */
    private String jwt;

    @Data
    @Builder
    public static class ParticipantSummary {
        private UUID userId;
        private LocalDateTime joinedAt;
        private LocalDateTime leftAt;
        private boolean ongoing;
    }
}
