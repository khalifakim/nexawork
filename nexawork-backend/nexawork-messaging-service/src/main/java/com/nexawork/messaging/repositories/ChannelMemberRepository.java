package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.ChannelMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelMemberRepository extends JpaRepository<ChannelMember, UUID> {

    List<ChannelMember> findByChannelId(UUID channelId);

    Optional<ChannelMember> findByChannelIdAndUserId(UUID channelId, UUID userId);

    boolean existsByChannelIdAndUserId(UUID channelId, UUID userId);

    void deleteByChannelIdAndUserId(UUID channelId, UUID userId);
}
