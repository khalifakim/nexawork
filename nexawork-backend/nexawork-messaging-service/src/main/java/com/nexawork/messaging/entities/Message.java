package com.nexawork.messaging.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @Column(nullable = false)
    private Long senderUserId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String attachmentUrl;
    private String attachmentName;

    @Column(nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();

    private Boolean edited = false;
}
