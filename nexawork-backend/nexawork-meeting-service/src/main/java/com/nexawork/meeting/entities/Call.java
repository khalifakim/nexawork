package com.nexawork.meeting.entities;

import com.nexawork.meeting.entities.enums.CallStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "calls")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Call {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false, unique = true)
    private String roomName;

    @Column(nullable = false)
    private Long organisationId;

    private Long projectId;

    @Column(nullable = false)
    private Long hostUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CallStatus status = CallStatus.SCHEDULED;

    private LocalDateTime scheduledAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "call", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CallParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "call", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExternalGuest> externalGuests = new ArrayList<>();
}
