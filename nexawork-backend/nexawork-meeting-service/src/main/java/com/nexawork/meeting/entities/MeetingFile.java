package com.nexawork.meeting.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_files")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MeetingFile {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    @Column(nullable = false)
    private Long fileId;

    @Column(nullable = false)
    private Long sharedBy;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime sharedAt = LocalDateTime.now();
}
