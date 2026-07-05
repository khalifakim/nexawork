package com.nexawork.messaging.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Participant d'une conversation (V5.1 §4.5). Clé composite (conversation + user).
 * Max 2 participants pour DIRECT (contrôle applicatif). {@code isRead} = état lu
 * de la conversation côté participant.
 */
@Entity
@Table(name = "conversation_participants")
@IdClass(ConversationParticipant.ParticipantId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationParticipant {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead;

    /** Clé primaire composite. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantId implements Serializable {
        private UUID conversation;
        private UUID userId;
    }
}
