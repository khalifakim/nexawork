package com.nexawork.messaging.entities;

import com.nexawork.messaging.entities.enums.MentionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_mentions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageMention {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @Enumerated(EnumType.STRING)
    @Column(name = "mention_type", nullable = false, length = 20)
    private MentionType mentionType;

    /** userId or channelId depending on mentionType; null for WORKSPACE/HASHTAG */
    private Long targetId;

    /** Raw text of the mention (e.g. "alice", "projet-alpha") */
    @Column(length = 100)
    private String targetText;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
