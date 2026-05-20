package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {
    List<Channel> findByOrganisationId(Long organisationId);
    List<Channel> findByProjectId(Long projectId);
}
