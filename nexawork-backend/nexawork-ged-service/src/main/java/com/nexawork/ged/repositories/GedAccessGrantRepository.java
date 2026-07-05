package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedAccessGrant;
import com.nexawork.ged.entities.enums.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GedAccessGrantRepository extends JpaRepository<GedAccessGrant, UUID> {

    List<GedAccessGrant> findByTargetTypeAndTargetId(TargetType targetType, UUID targetId);

    void deleteByTargetTypeAndTargetId(TargetType targetType, UUID targetId);

    /** Grants dont l'utilisateur (ou l'une de ses équipes) est bénéficiaire. */
    List<GedAccessGrant> findByGranteeIdIn(List<UUID> granteeIds);
}
