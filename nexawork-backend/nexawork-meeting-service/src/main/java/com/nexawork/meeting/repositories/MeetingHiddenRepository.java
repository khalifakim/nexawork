package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.MeetingHidden;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MeetingHiddenRepository extends JpaRepository<MeetingHidden, MeetingHidden.MeetingHiddenId> {

    boolean existsByCallIdAndUserId(UUID callId, UUID userId);

    List<MeetingHidden> findByUserId(UUID userId);
}
