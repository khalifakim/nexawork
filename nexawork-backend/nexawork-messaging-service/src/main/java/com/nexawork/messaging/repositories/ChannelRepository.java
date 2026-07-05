package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.enums.ChannelType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    List<Channel> findByOrganisationIdAndChannelType(UUID organisationId, ChannelType channelType);

    List<Channel> findByProjectId(UUID projectId);

    /** Idempotence du seeding project.created : canal système par nom dans un projet. */
    Optional<Channel> findByProjectIdAndNameAndIsSystemTrue(UUID projectId, String name);

    boolean existsByProjectIdAndNameAndIsSystemTrue(UUID projectId, String name);
}
