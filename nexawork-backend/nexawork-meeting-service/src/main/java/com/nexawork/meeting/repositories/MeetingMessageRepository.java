package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.MeetingMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingMessageRepository extends JpaRepository<MeetingMessage, Long> {
    List<MeetingMessage> findByCallIdOrderBySentAtAsc(Long callId);
}
