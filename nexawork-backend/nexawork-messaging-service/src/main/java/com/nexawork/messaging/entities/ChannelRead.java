package com.nexawork.messaging.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * État de lecture d'un canal par un utilisateur (§5.x — parité avec les
 * conversations). {@code lastReadAt} = instant où l'utilisateur a ouvert le canal
 * pour la dernière fois. Les messages postés après cette date (par d'autres) sont
 * « non lus ». Vaut pour les canaux publics comme privés : une ligne est créée à
 * la première ouverture, indépendamment de l'appartenance (non matérialisée pour
 * les canaux publics).
 */
@Entity
@Table(name = "channel_reads",
        uniqueConstraints = @UniqueConstraint(name = "uk_channel_reads_channel_user",
                columnNames = {"channel_id", "user_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelRead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;
}
