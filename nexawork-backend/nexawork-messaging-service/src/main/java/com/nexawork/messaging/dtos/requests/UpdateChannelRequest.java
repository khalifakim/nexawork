package com.nexawork.messaging.dtos.requests;

import com.nexawork.messaging.entities.enums.ChannelIcon;
import lombok.Data;

/**
 * Mise à jour d'un canal (§13.5 PATCH V5) : renommer, changer l'icône (HASH↔BELL),
 * basculer readonly. Réservé ADMIN (org) ou chef de projet (projet). {@code isPrivate}
 * reste géré par l'endpoint /access. Champs nuls = inchangés.
 */
@Data
public class UpdateChannelRequest {

    private String name;

    private ChannelIcon icon;

    private Boolean readonly;
}
