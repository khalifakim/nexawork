package com.nexawork.messaging.entities;

import com.nexawork.messaging.entities.enums.MentionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Mention extraite du contenu à l'envoi (V5.1 §4.5). Composition dans un Message
 * (cascade). {@code isRead} porte l'état lu/non-lu côté vue « Mentions reçues ».
 */
@Entity
@Table(name = "message_mentions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageMention {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @Enumerated(EnumType.STRING)
    @Column(name = "mention_type", nullable = false, length = 20)
    private MentionType mentionType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "target_text", length = 100)
    private String targetText;

    /** État lu/non-lu de la mention (vue « Mentions reçues », §5.3). */
    @Column(name = "is_read", nullable = false)
    private Boolean isRead;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
