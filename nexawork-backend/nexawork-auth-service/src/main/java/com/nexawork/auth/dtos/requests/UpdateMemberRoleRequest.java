package com.nexawork.auth.dtos.requests;

import com.nexawork.auth.entities.enums.OrgRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRoleRequest(
    @NotNull OrgRole role
) {}
