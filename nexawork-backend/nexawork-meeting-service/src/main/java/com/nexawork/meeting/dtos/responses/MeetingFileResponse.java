package com.nexawork.meeting.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/** Fichier partagé pendant une réunion (M5) — trace consultable après l'appel. */
@Data
@Builder
public class MeetingFileResponse {

    private UUID id;
    private UUID callId;
    private String fileName;
    private Long fileSize;
    private String sharedByName;
    private UUID sharedBy;
    private LocalDateTime sharedAt;
}
