package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.MeetingFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MeetingFileRepository extends JpaRepository<MeetingFile, UUID> {

    /** Fichiers partagés pendant une réunion, dans l'ordre chronologique. */
    List<MeetingFile> findByCallIdOrderBySharedAtAsc(UUID callId);

    /** Le même fichier ne doit pas être enregistré deux fois (événement rejoué). */
    boolean existsByCallIdAndJaasFileId(UUID callId, String jaasFileId);
}
