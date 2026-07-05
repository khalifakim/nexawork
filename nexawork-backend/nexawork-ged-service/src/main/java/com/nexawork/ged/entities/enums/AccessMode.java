package com.nexawork.ged.entities.enums;

/**
 * Mode de visibilité d'un élément GED (REF G, §11.6/§11.7). Ajout V5.1 (le modèle
 * §4.4 ne portait pas ce champ, indispensable pour distinguer les 3 modes) :
 * <ul>
 *   <li>{@code OPEN} — tous les membres de l'espace (workspace ou projet) ;</li>
 *   <li>{@code PRIVATE} — le propriétaire seul ;</li>
 *   <li>{@code SHARED} — le propriétaire + les bénéficiaires des grants.</li>
 * </ul>
 */
public enum AccessMode {
    OPEN,
    PRIVATE,
    SHARED
}
