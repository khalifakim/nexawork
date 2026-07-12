package com.nexawork.meeting.entities;

import com.nexawork.meeting.entities.enums.CallStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * Appel vidéo (V5.1 §4.6). {@code roomName} = nom technique unique de la salle
 * JaaS. Références logiques (organisationId, hostUserId) sans FK. Une réunion est
 * rattachée au workspace (organisationId), jamais à un projet.
 */
@Entity
@Table(name = "calls")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "topic", nullable = false)
    private String topic;

    @Column(name = "room_name", nullable = false, unique = true)
    private String roomName;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @Column(name = "host_user_id", nullable = false)
    private UUID hostUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private CallStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
