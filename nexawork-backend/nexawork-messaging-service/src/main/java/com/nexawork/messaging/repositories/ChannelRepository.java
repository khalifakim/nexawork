package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.enums.ChannelType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    List<Channel> findByOrganisationIdAndChannelType(UUID organisationId, ChannelType channelType);

    /** Tous les canaux du workspace (org + projets) — la sidebar les veut tous. */
    List<Channel> findByOrganisationId(UUID organisationId);

    List<Channel> findByProjectId(UUID projectId);

    /** Supprime tous les canaux d'un projet (à la suppression du projet — cf. consumer). */
    long deleteByProjectId(UUID projectId);

    /**
     * Recherche globale (§4.8) : canaux du workspace dont le nom contient le
     * terme. La visibilité (REF F — canaux privés) est appliquée en aval par le
     * garde d'accès : un canal privé n'apparaît pas pour un non-membre.
     */
    @Query("""
            SELECT c FROM Channel c
            WHERE c.organisationId = :orgId
              AND LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY c.createdAt DESC
            """)
    List<Channel> search(@Param("orgId") UUID orgId, @Param("q") String q, Pageable pageable);

    /** Idempotence du seeding project.created : canal système par nom dans un projet. */
    Optional<Channel> findByProjectIdAndNameAndIsSystemTrue(UUID projectId, String name);

    boolean existsByProjectIdAndNameAndIsSystemTrue(UUID projectId, String name);
}
