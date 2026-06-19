package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedAccessGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GedAccessGrantRepository extends JpaRepository<GedAccessGrant, Long> {

    List<GedAccessGrant> findByTargetTypeAndTargetId(String targetType, Long targetId);

    List<GedAccessGrant> findByGranteeTypeAndGranteeId(String granteeType, Long granteeId);

    boolean existsByTargetTypeAndTargetIdAndGranteeTypeAndGranteeId(
        String targetType, Long targetId, String granteeType, Long granteeId);
}
