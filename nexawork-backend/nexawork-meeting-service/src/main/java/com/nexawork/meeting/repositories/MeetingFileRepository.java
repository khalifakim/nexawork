package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.MeetingFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingFileRepository extends JpaRepository<MeetingFile, UUID> {

    /** Fichiers partagés pendant une réunion, dans l'ordre chronologique. */
    List<MeetingFile> findByCallIdOrderBySharedAtAsc(UUID callId);

    /** Un même StoredFile ne doit être rattaché qu'une fois à l'appel (rejeu, double clic). */
    Optional<MeetingFile> findByCallIdAndFileId(UUID callId, UUID fileId);
}
