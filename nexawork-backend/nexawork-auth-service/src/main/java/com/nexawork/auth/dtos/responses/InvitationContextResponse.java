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
}
