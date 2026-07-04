package com.nexawork.auth.entities;

import com.nexawork.commons.audits.Auditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Espace de travail isolé (tenant) — la classe « Organisation » représente le
 * concept fonctionnel de Workspace (V5.1 §4.1).
 */
@Entity
@Table(name = "organisations")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Organisation extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

    /**
     * Couleur hex de l'icône (palette standard 10 couleurs, §3.3) —
     * seule représentation visuelle du workspace.
     */
    @Column(name = "color", nullable = false, length = 9)
    private String color;

    /**
     * Réservé futur (upload d'icône) — toujours NULL en v1.
     */
    @Column(name = "icon_url", length = 1024)
    private String iconUrl;
}
