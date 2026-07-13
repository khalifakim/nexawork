package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.MeetingMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MeetingMessageRepository extends JpaRepository<MeetingMessage, UUID> {

    /** Fil du chat d'une réunion, dans l'ordre chronologique. */
    List<MeetingMessage> findByCallIdOrderBySentAtAsc(UUID callId);
}
