package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.MeetingFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingFileRepository extends JpaRepository<MeetingFile, Long> {
    List<MeetingFile> findByCallIdOrderBySharedAtAsc(Long callId);
}
