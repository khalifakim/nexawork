package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.ExternalGuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExternalGuestRepository extends JpaRepository<ExternalGuest, Long> {
    Optional<ExternalGuest> findByGuestToken(String guestToken);
}
