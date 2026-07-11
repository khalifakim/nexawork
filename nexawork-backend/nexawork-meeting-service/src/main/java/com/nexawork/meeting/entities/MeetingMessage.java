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
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Message du chat d'une réunion (F5, V5.1 §14.3) — persistance de la
 * conversation d'appel captée via l'IFrame API JaaS. Consultable en lecture
 * seule après la fin de la réunion. Composition : cascade avec l'appel parent.
 */
@Entity
@Table(name = "meeting_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    /** Auteur interne (UUID), vide si l'auteur est un invité externe. */
    @Column(name = "author_id")
    private UUID authorId;

    @Column(name = "author_name", nullable = false)
    private String authorName;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;
}
