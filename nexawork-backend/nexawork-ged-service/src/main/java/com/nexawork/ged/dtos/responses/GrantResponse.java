package com.nexawork.ged.dtos.responses;

import com.nexawork.ged.entities.enums.AccessLevel;
import com.nexawork.ged.entities.enums.GranteeType;
import com.nexawork.ged.entities.enums.TargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ligne d'accès (§11.6). {@code owner=true} marque la ligne du propriétaire
 * (badge « Propriétaire », non retirable — R13) ; elle est synthétique (pas un
 * GedAccessGrant en base).
 */
@Data
@Builder
public class GrantResponse {

    private UUID id;
    private TargetType targetType;
    private UUID targetId;
    private GranteeType granteeType;
    private UUID granteeId;
    private AccessLevel accessLevel;
    private UUID grantedBy;
    private LocalDateTime createdAt;
    /** Ligne propriétaire verrouillée (R13) — pas de retrait possible. */
    private boolean owner;
}
