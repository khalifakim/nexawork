package com.nexawork.project.entities.enums;

/**
 * Rôle d'un membre au sein d'un projet (V5.1 §6.2). Distinct du rôle workspace
 * (OrgRole) porté par le token.
 *
 * <p>Le modèle est volontairement binaire — chef de projet ou membre — car c'est
 * la seule distinction exploitée par les règles d'accès projet (le chef de projet
 * effectif reste {@code Project.ownerUserId}). Une granularité plus fine
 * (gestionnaire / contributeur / lecteur) est envisagée comme évolution mais
 * n'est pas implémentée.</p>
 */
public enum ProjectRole {
    /** Chef de projet : gère l'équipe, le workflow et le contenu du projet. */
    PROJECT_LEAD,
    /** Membre simple du projet. */
    PROJECT_MEMBER
}
