package com.nexawork.messaging.dtos.requests;

import com.nexawork.messaging.entities.enums.ChannelIcon;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Création d'un canal (§13.5, §12). {@code projectId} nul = canal organisation
 * (R14 : ADMIN+OWNER). {@code isPrivate} → liste de membres autorisés.
 */
@Data
public class CreateChannelRequest {

    @NotBlank(message = "est obligatoire")
    private String name;

    private ChannelIcon icon;

    /** Canal de projet si renseigné, sinon canal organisation. */
    private UUID projectId;

    private Boolean readonly;

    private Boolean isPrivate;

    /** Membres autorisés si canal privé. */
    private List<UUID> memberUserIds;
}
