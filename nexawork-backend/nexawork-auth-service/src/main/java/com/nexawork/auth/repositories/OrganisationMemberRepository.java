package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.OrganisationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganisationMemberRepository extends JpaRepository<OrganisationMember, UUID> {

    List<OrganisationMember> findAllByOrganisationId(UUID organisationId);

    List<OrganisationMember> findAllByUserId(UUID userId);

    Optional<OrganisationMember> findByOrganisationIdAndUserId(UUID organisationId, UUID userId);

    boolean existsByOrganisationIdAndUserId(UUID organisationId, UUID userId);

    long countByOrganisationId(UUID organisationId);
}
