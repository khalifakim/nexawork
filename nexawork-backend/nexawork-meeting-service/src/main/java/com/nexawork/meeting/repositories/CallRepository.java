package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.enums.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CallRepository extends JpaRepository<Call, UUID> {

    List<Call> findByOrganisationIdOrderByCreatedAtDesc(UUID organisationId);

    Optional<Call> findByRoomName(String roomName);

    /** Balayage des appels abandonnés (toutes organisations confondues). */
    List<Call> findByStatus(CallStatus status);
}
