package com.nexawork.meeting.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Participant interne d'un appel (V5.1 §4.6). {@code joinedAt != null && leftAt == null}
 * sur un appel ACTIVE = « en cours » (base de REF A). {@code invitedExplicitly} →
 * lobby_bypass dans le JWT JaaS.
 */
@Entity
@Table(name = "call_participants")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Column(name = "invited_explicitly", nullable = false)
    private Boolean invitedExplicitly;
}
