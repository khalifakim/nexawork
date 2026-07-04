package com.nexawork.auth.entities.audits;

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

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Trace d'audit applicative alimentée par l'aspect {@code @Journal}
 * (JournalEntity Smart-Mifin, renommée pour éviter la confusion avec un
 * éventuel domaine métier « journal »).
 */
@Entity
@Table(name = "audit_trail")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditTrailEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "entity_name")
    private String entityName;

    @Column(name = "entity_id")
    private String entityId;

    @Column(name = "actor", nullable = false)
    private String actor;

    @Column(name = "action_date", nullable = false)
    private LocalDateTime actionDate;

    @Column(name = "details", columnDefinition = "text")
    private String details;
}
