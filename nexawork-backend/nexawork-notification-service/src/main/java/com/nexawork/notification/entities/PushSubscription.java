package com.nexawork.notification.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Abonnement Web Push d'un navigateur (V5.1 §4.7). Un utilisateur peut en avoir
 * plusieurs (multi-appareils). {@code keys} = { p256dh, auth } fournis par
 * {@code PushManager.subscribe()}.
 */
@Entity
@Table(name = "push_subscriptions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "endpoint", nullable = false, length = 2048, unique = true)
    private String endpoint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "keys", nullable = false, columnDefinition = "jsonb")
    private Map<String, String> keys;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
