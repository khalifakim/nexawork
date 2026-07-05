package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.CallParticipant;
import com.nexawork.meeting.entities.enums.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CallParticipantRepository extends JpaRepository<CallParticipant, UUID> {

    List<CallParticipant> findByCallId(UUID callId);

    Optional<CallParticipant> findByCallIdAndUserId(UUID callId, UUID userId);

    /**
     * REF A : l'appel ACTIF « en cours » d'un utilisateur (participant présent :
     * joined et pas encore left). {@code Optional.empty()} s'il n'est dans aucun.
     */
    @Query("""
            SELECT p FROM CallParticipant p
            WHERE p.userId = :userId AND p.joinedAt IS NOT NULL AND p.leftAt IS NULL
              AND p.call.status = :activeStatus
            """)
    List<CallParticipant> findOngoing(@Param("userId") UUID userId, @Param("activeStatus") CallStatus activeStatus);
}
