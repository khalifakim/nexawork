package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.OrganisationMember;
import com.nexawork.auth.entities.enums.OrgRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganisationMemberRepository extends JpaRepository<OrganisationMember, Long> {
    List<OrganisationMember> findByOrganisationId(Long organisationId);
    List<OrganisationMember> findByUserId(Long userId);
    Optional<OrganisationMember> findByOrganisationIdAndUserId(Long organisationId, Long userId);
    boolean existsByOrganisationIdAndUserId(Long organisationId, Long userId);
    boolean existsByOrganisationIdAndUserIdAndOrgRoleIn(Long orgId, Long userId, List<OrgRole> roles);
}
