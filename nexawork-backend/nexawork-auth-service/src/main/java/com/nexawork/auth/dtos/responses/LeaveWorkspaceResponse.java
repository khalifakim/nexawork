package com.nexawork.auth.dtos.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * R20 — `wasActive: true` si le workspace quitté était le workspace actif :
 * le refresh token a été révoqué, le client déclenche session.logout().
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveWorkspaceResponse {

    private boolean wasActive;
}
