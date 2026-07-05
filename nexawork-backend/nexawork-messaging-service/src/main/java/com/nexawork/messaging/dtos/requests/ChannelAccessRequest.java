package com.nexawork.messaging.dtos.requests;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Modification des règles d'accès d'un canal (§13.5 PUT /channels/{id}/access) :
 * public ou privé + liste de membres autorisés (REF F, R16 best-effort).
 */
@Data
public class ChannelAccessRequest {

    @NotNull(message = "est obligatoire")
    private Boolean isPrivate;

    private List<UUID> memberUserIds;
}
