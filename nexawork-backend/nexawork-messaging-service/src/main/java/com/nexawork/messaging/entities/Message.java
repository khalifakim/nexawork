package com.nexawork.messaging.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id")
    private Channel channel;

    @Column(name = "conversation_id")
    private Long conversationId;

    @Column(nullable = false)
    private Long senderUserId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String attachmentUrl;
    private String attachmentName;

    @Column(nullable = false)
    @Builder.Default
    private String messageType = "USER";

    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();

    @Builder.Default
    private Boolean edited = false;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MessageMention> mentions = new ArrayList<>();
}
