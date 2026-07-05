package com.nexawork.meeting.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Masquage d'un appel de l'historique personnel d'un utilisateur (V5.1 §4.6 —
 * « Masquer de mon historique »). Clé composite (callId + userId).
 */
@Entity
@Table(name = "meeting_hidden")
@IdClass(MeetingHidden.MeetingHiddenId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingHidden {

    @Id
    @Column(name = "call_id", nullable = false)
    private UUID callId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MeetingHiddenId implements Serializable {
        private UUID callId;
        private UUID userId;
    }
}
