package com.nexawork.auth.dtos.responses;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nexawork.auth.entities.enums.OrgRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Contexte public d'une invitation pour le bandeau §3.2 : invitant, workspace
 * (monogramme coloré), rôle imposé, compteur de membres.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InvitationContextResponse {

    private String workspaceName;
    private String workspaceColor;
    private String inviterDisplayName;
    private String email;
    private OrgRole role;
    private Long memberCount;

    /**
     * Vrai si un compte existe déjà pour l'email invité (§3.2) : le front propose
     * alors « Rejoindre » (connexion préalable) au lieu du formulaire d'inscription.
     */
    private Boolean accountExists;
}
