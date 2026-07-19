package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.ChannelRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChannelReadRepository extends JpaRepository<ChannelRead, UUID> {

    Optional<ChannelRead> findByChannelIdAndUserId(UUID channelId, UUID userId);
}
