package com.nexawork.meeting.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.meeting.dtos.requests.CreateMeetingMessageRequest;
import com.nexawork.meeting.dtos.requests.ShareMeetingFileRequest;
import com.nexawork.meeting.dtos.responses.MeetingFileResponse;
import com.nexawork.meeting.dtos.responses.MeetingMessageResponse;
import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.MeetingFile;
import com.nexawork.meeting.entities.MeetingMessage;
import com.nexawork.meeting.repositories.CallParticipantRepository;
import com.nexawork.meeting.repositories.CallRepository;
import com.nexawork.meeting.repositories.MeetingFileRepository;
import com.nexawork.meeting.repositories.MeetingMessageRepository;
import com.nexawork.meeting.security.CallerContext;
import com.nexawork.meeting.services.MeetingChatService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Chat de réunion persistant (M2). Réservé aux participants de l'appel : seul un
 * membre qui a rejoint (ou l'hôte) peut ingérer et consulter le fil.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingChatServiceImpl implements MeetingChatService {

    CallRepository callRepository;
    CallParticipantRepository participantRepository;
    MeetingMessageRepository messageRepository;
    MeetingFileRepository fileRepository;
    CallerContext caller;

    @Override
    public MeetingMessageResponse add(UUID callId, CreateMeetingMessageRequest request) {
        Call call = loadAsParticipant(callId);
        MeetingMessage saved = messageRepository.save(MeetingMessage.builder()
                .call(call)
                .authorId(caller.userId())
                .authorName(caller.displayName())
                .content(request.getContent())
                .build());
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MeetingMessageResponse> list(UUID callId) {
        loadAsParticipant(callId);
        return messageRepository.findByCallIdOrderBySentAtAsc(callId).stream().map(this::toDto).toList();
    }

    /**
     * Enregistre un fichier partagé dans la salle (M5). Le binaire reste hébergé
     * par JaaS : on ne persiste que les métadonnées, et {@code fileId} (File
     * Service) reste nul — inventer un identifiant qui ne pointerait sur rien
     * serait pire que de ne rien stocker.
     */
    @Override
    public MeetingFileResponse shareFile(UUID callId, ShareMeetingFileRequest request) {
        Call call = loadAsParticipant(callId);
        // L'événement `fileUploaded` est reçu par CHAQUE participant : sans cette
        // garde, un même fichier serait enregistré autant de fois qu'il y a de
        // personnes dans la salle.
        return fileRepository.findByCallIdOrderBySharedAtAsc(callId).stream()
                .filter(f -> request.getJaasFileId().equals(f.getJaasFileId()))
                .findFirst()
                .map(this::toDto)
                .orElseGet(() -> toDto(fileRepository.save(MeetingFile.builder()
                        .call(call)
                        .jaasFileId(request.getJaasFileId())
                        .fileName(request.getFileName())
                        .fileSize(request.getFileSize())
                        .sharedBy(caller.userId())
                        .sharedByName(caller.displayName())
                        .build())));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MeetingFileResponse> files(UUID callId) {
        loadAsParticipant(callId);
        return fileRepository.findByCallIdOrderBySharedAtAsc(callId).stream().map(this::toDto).toList();
    }

    private MeetingFileResponse toDto(MeetingFile f) {
        return MeetingFileResponse.builder()
                .id(f.getId())
                .callId(f.getCall().getId())
                .fileName(f.getFileName())
                .fileSize(f.getFileSize())
                .sharedBy(f.getSharedBy())
                .sharedByName(f.getSharedByName())
                .sharedAt(f.getSharedAt())
                .build();
    }

    /** Charge l'appel borné au workspace et vérifie que l'appelant en est participant. */
    private Call loadAsParticipant(UUID callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Appel introuvable."));
        if (!call.getOrganisationId().equals(caller.organisationId())) {
            throw new ResourceNotFoundException("Appel introuvable.");
        }
        boolean isHost = call.getHostUserId().equals(caller.userId());
        boolean isParticipant = participantRepository.findByCallIdAndUserId(callId, caller.userId()).isPresent();
        if (!isHost && !isParticipant) {
            throw new ForbiddenException("Chat réservé aux participants de la réunion.");
        }
        return call;
    }

    private MeetingMessageResponse toDto(MeetingMessage m) {
        return MeetingMessageResponse.builder()
                .id(m.getId())
                .callId(m.getCall().getId())
                .authorId(m.getAuthorId())
                .authorName(m.getAuthorName())
                .content(m.getContent())
                .sentAt(m.getSentAt())
                .build();
    }
}
