package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PATCH /workspace-members/{id}/active (§13.1) : toggle isDeactivated.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToggleMemberActiveRequest {

    @NotNull
    private Boolean active;
}
