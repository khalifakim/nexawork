package com.nexawork.meeting.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_participants")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CallParticipant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    @Column(nullable = false)
    private Long userId;

    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean invitedExplicitly = false;
}
