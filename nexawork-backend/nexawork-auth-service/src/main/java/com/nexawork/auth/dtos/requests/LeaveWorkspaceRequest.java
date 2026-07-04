package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * POST /workspace-members/leave (§13.1, R20) : self-leave du workspace.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveWorkspaceRequest {

    @NotNull
    private UUID workspaceId;
}
