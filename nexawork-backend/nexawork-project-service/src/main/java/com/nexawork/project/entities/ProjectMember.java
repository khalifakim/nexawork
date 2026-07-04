package com.nexawork.project.entities;

import com.nexawork.project.entities.enums.ProjectRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Appartenance d'un utilisateur à un projet (V5.1 §4.2) : rôle projet,
 * rattachement optionnel à une équipe, désignation chef d'équipe. Un seul rôle
 * par utilisateur et par projet (UNIQUE project_id + user_id).
 */
@Entity
@Table(name = "project_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_project_members_project_user",
                columnNames = {"project_id", "user_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "project_role", nullable = false, length = 50)
    private ProjectRole projectRole;

    /** Équipe du membre (optionnel) — SET NULL si l'équipe est supprimée. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    /** Chef de l'équipe / responsable au sein du projet. */
    @Column(name = "is_project_lead", nullable = false)
    private Boolean isProjectLead;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;
}
