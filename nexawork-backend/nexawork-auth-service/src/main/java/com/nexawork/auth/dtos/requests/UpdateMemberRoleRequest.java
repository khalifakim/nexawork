package com.nexawork.auth.dtos.requests;

import com.nexawork.auth.entities.enums.OrgRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PATCH /workspace-members/{id}/role (§13.1, R18) : MEMBER ↔ ADMIN uniquement —
 * OWNER n'est jamais attribuable ni retirable (REF C, contrôle en service).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRoleRequest {

    @NotNull
    private OrgRole role;
}
