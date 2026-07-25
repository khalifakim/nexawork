package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.SharedLink;
import com.nexawork.ged.entities.enums.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SharedLinkRepository extends JpaRepository<SharedLink, UUID> {

    /** Résolution publique par token (aucune notion d'appelant : le token EST l'accès). */
    Optional<SharedLink> findByToken(String token);

    /** Mes liens dans le workspace actif, les plus récents d'abord (vue authentifiée). */
    List<SharedLink> findByCreatedByUserIdAndOrganisationIdOrderByCreatedAtDesc(UUID createdByUserId, UUID organisationId);

    /** Liens actifs pointant sur un élément donné (badge « partagé » côté GED). */
    List<SharedLink> findByOrganisationIdAndTargetTypeAndTargetIdAndRevokedFalse(
            UUID organisationId, TargetType targetType, UUID targetId);
}
