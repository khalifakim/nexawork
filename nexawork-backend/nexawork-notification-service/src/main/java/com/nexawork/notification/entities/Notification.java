package com.nexawork.notification.entities;

import com.nexawork.notification.entities.enums.NotificationType;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Notification in-app (V5.1 §4.7). Destinataire = {@code recipientUserId}.
 * {@code payload} JSONB porte des données métier (ids de tâche/projet…). Le
 * repository filtre {@code isHidden=false} par défaut.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "recipient_user_id", nullable = false)
    private UUID recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 100)
    private NotificationType type;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "target_url", length = 1024)
    private String targetUrl;

    @Column(name = "read", nullable = false)
    private Boolean read;

    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden;

    @Column(name = "workspace_id")
    private UUID workspaceId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
