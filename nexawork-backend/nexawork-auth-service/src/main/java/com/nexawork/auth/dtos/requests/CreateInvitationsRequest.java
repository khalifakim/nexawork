package com.nexawork.auth.dtos.requests;

import com.nexawork.auth.entities.enums.OrgRole;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /workspaces/{id}/invitations (§13.1) — invitation multiple : chaque
 * email génère une ligne Invitation distincte partageant le même rôle (§4.1).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitationsRequest {

    @NotEmpty
    private List<String> emails;

    @NotNull
    private OrgRole role;
}
