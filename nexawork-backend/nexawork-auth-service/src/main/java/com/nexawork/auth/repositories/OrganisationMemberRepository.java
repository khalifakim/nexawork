package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.OrganisationMember;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganisationMemberRepository extends JpaRepository<OrganisationMember, UUID> {

    /**
     * Recherche globale (§4.8) : membres actifs du workspace dont le prénom, le
     * nom ou l'email contient le terme (insensible à la casse).
     */
    @Query("""
            SELECT m FROM OrganisationMember m
            JOIN FETCH m.user u
            WHERE m.organisation.id = :orgId
              AND m.isDeactivated = FALSE
              AND (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY u.firstName ASC
            """)
    List<OrganisationMember> search(@Param("orgId") UUID orgId, @Param("q") String q, Pageable pageable);

    List<OrganisationMember> findAllByOrganisationId(UUID organisationId);

    List<OrganisationMember> findAllByUserId(UUID userId);

    Optional<OrganisationMember> findByOrganisationIdAndUserId(UUID organisationId, UUID userId);

    boolean existsByOrganisationIdAndUserId(UUID organisationId, UUID userId);

    long countByOrganisationId(UUID organisationId);
}
