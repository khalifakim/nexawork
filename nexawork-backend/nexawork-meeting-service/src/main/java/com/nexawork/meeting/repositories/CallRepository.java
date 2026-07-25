package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.enums.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CallRepository extends JpaRepository<Call, UUID> {

    List<Call> findByOrganisationIdOrderByCreatedAtDesc(UUID organisationId);

    Optional<Call> findByRoomName(String roomName);

    /** Balayage des appels abandonnés (toutes organisations confondues). */
    List<Call> findByStatus(CallStatus status);

    /**
     * Passe l'appel de {@code ACTIVE} à {@code ENDED} de façon ATOMIQUE. Renvoie le
     * nombre de lignes modifiées : {@code 1} si CE thread a réalisé la transition
     * (il doit alors publier {@code call.ended}), {@code 0} si un autre l'a déjà
     * terminé. Évite les doubles publications (donc les notifications en double)
     * quand l'hôte termine pendant que le dernier participant quitte, ou lors de
     * départs concurrents.
     */
    @Modifying
    @Query("UPDATE Call c SET c.status = com.nexawork.meeting.entities.enums.CallStatus.ENDED, "
            + "c.endedAt = :now WHERE c.id = :id AND c.status = com.nexawork.meeting.entities.enums.CallStatus.ACTIVE")
    int markEndedIfActive(@Param("id") UUID id, @Param("now") LocalDateTime now);
}
