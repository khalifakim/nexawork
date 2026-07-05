package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.ExternalGuest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExternalGuestRepository extends JpaRepository<ExternalGuest, UUID> {

    Optional<ExternalGuest> findByGuestToken(String guestToken);

    List<ExternalGuest> findByCallId(UUID callId);
}
