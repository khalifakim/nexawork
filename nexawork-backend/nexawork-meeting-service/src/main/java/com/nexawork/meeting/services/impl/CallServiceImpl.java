package com.nexawork.meeting.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.CallParticipant;
import com.nexawork.meeting.entities.MeetingHidden;
import com.nexawork.meeting.entities.enums.CallStatus;
import com.nexawork.meeting.events.publishers.CallEndedEvent;
import com.nexawork.meeting.events.publishers.MeetingEventPublisher;
import com.nexawork.meeting.properties.JitsiProperties;
import com.nexawork.meeting.repositories.CallParticipantRepository;
import com.nexawork.meeting.repositories.CallRepository;
import com.nexawork.meeting.repositories.MeetingHiddenRepository;
import com.nexawork.meeting.security.CallerContext;
import com.nexawork.meeting.services.CallService;
import com.nexawork.meeting.services.JitsiTokenService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Appels (§13.6). REF A appliqué à create/join ; token JaaS RS256 généré via
 * {@link JitsiTokenService} ; URL assemblée selon §9.9.5 ; {@code call.ended} publié
 * à la fin.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallServiceImpl implements CallService {

    CallRepository callRepository;
    CallParticipantRepository participantRepository;
    MeetingHiddenRepository hiddenRepository;
    JitsiTokenService tokenService;
    MeetingEventPublisher eventPublisher;
    JitsiProperties jitsiProperties;
    CallerContext caller;

    @Override
    public CallResponse create(CreateCallRequest request) {
        UUID host = caller.userId();
        requireNotAlreadyInCall(host); // REF A

        Call call = callRepository.save(Call.builder()
                .topic(request.getTopic())
                .roomName(generateRoomName())
                .organisationId(caller.organisationId())
                .projectId(request.getProjectId())
                .hostUserId(host)
                .status(CallStatus.ACTIVE)
                .startedAt(LocalDateTime.now())
                .build());

        // L'hôte est participant modérateur, entré immédiatement (invité explicitement).
        participantRepository.save(CallParticipant.builder()
                .call(call).userId(host)
                .joinedAt(LocalDateTime.now()).invitedExplicitly(true).build());

        String token = tokenService.generateToken(call.getRoomName(), host,
                caller.displayName(), null, true);
        log.info("Appel {} lancé par {} (salle {})", call.getId(), host, call.getRoomName());
        return toResponse(call, token);
    }

    @Override
    public CallResponse join(UUID callId) {
        UUID me = caller.userId();
        Call call = loadInOrg(callId);
        if (call.getStatus() != CallStatus.ACTIVE) {
            throw new ConflictException("Cet appel n'est pas actif.");
        }
        // REF A : refus si déjà dans un autre appel en cours.
        participantRepository.findOngoing(me, CallStatus.ACTIVE).stream()
                .filter(p -> !p.getCall().getId().equals(callId))
                .findAny()
                .ifPresent(p -> {
                    throw new ConflictException(
                            "ALREADY_IN_CALL : vous êtes déjà dans un appel (" + p.getCall().getId() + ").");
                });

        CallParticipant participant = participantRepository.findByCallIdAndUserId(callId, me)
                .orElseGet(() -> CallParticipant.builder()
                        .call(call).userId(me).invitedExplicitly(false).build());
        participant.setJoinedAt(LocalDateTime.now());
        participant.setLeftAt(null);
        participantRepository.save(participant);

        boolean isHost = call.getHostUserId().equals(me);
        String token = tokenService.generateToken(call.getRoomName(), me,
                caller.displayName(), null, isHost);
        return toResponse(call, token);
    }

    @Override
    public void leave(UUID callId) {
        UUID me = caller.userId();
        participantRepository.findByCallIdAndUserId(callId, me).ifPresent(p -> {
            p.setLeftAt(LocalDateTime.now());
            participantRepository.save(p);
        });
    }

    @Override
    public void end(UUID callId) {
        Call call = loadInOrg(callId);
        // L'hôte ou un administrateur peut clore l'appel pour tout le monde.
        if (!call.getHostUserId().equals(caller.userId()) && !caller.isWorkspaceAdmin()) {
            throw new com.nexawork.commons.exceptions.ForbiddenException(
                    "Seul l'hôte ou un administrateur peut terminer l'appel.");
        }
        if (call.getStatus() == CallStatus.ENDED) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        call.setStatus(CallStatus.ENDED);
        call.setEndedAt(now);
        callRepository.save(call);

        // Tous les participants encore présents quittent.
        participantRepository.findByCallId(callId).stream()
                .filter(p -> p.getLeftAt() == null)
                .forEach(p -> { p.setLeftAt(now); participantRepository.save(p); });

        long durationSeconds = call.getStartedAt() != null
                ? Duration.between(call.getStartedAt(), now).getSeconds() : 0;
        eventPublisher.publishCallEnded(new CallEndedEvent(
                call.getId(), call.getTopic(), call.getRoomName(),
                call.getOrganisationId(), call.getProjectId(), call.getHostUserId(), durationSeconds));
        log.info("Appel {} terminé (durée {}s)", callId, durationSeconds);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CallResponse> history() {
        UUID me = caller.userId();
        return callRepository.findByOrganisationIdOrderByCreatedAtDesc(caller.organisationId()).stream()
                .filter(c -> !hiddenRepository.existsByCallIdAndUserId(c.getId(), me))
                .filter(c -> c.getHostUserId().equals(me)
                        || participantRepository.findByCallIdAndUserId(c.getId(), me).isPresent())
                .map(c -> toResponse(c, null))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CallResponse get(UUID callId) {
        return toResponse(loadInOrg(callId), null);
    }

    @Override
    @Transactional(readOnly = true)
    public CallResponse ongoing() {
        return participantRepository.findOngoing(caller.userId(), CallStatus.ACTIVE).stream()
                .findFirst()
                .map(p -> toResponse(p.getCall(), null))
                .orElse(null);
    }

    @Override
    public void hide(UUID callId) {
        loadInOrg(callId); // borne au workspace (404 sinon)
        UUID me = caller.userId();
        if (!hiddenRepository.existsByCallIdAndUserId(callId, me)) {
            hiddenRepository.save(MeetingHidden.builder().callId(callId).userId(me).build());
        }
    }

    @Override
    public void delete(UUID callId) {
        Call call = loadInOrg(callId);
        // REF B : suppression de l'historique réservée aux administrateurs/propriétaires.
        if (!caller.isWorkspaceAdmin()) {
            throw new ForbiddenException("Suppression réservée aux administrateurs et au propriétaire (REF B).");
        }
        callRepository.delete(call); // cascade DB : participants, invités, chat, fichiers, masquages
        log.info("Appel {} supprimé par {}", callId, caller.userId());
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /** REF A : refuse (409) si l'appelant est déjà dans un appel en cours. */
    private void requireNotAlreadyInCall(UUID userId) {
        if (!participantRepository.findOngoing(userId, CallStatus.ACTIVE).isEmpty()) {
            throw new ConflictException("ALREADY_IN_CALL : vous êtes déjà dans un appel. Terminez-le d'abord.");
        }
    }

    private Call loadInOrg(UUID callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Appel introuvable."));
        if (!call.getOrganisationId().equals(caller.organisationId())) {
            throw new ResourceNotFoundException("Appel introuvable.");
        }
        return call;
    }

    /** Nom de salle technique : 32 caractères hexadécimaux (§9.9.4.b). */
    private String generateRoomName() {
        return (UUID.randomUUID().toString() + UUID.randomUUID().toString()).replace("-", "").substring(0, 32);
    }

    private CallResponse toResponse(Call c, String token) {
        String jitsiUrl = token != null
                ? jitsiProperties.getUrl() + "/" + jitsiProperties.getAppId() + "/" + c.getRoomName() + "?jwt=" + token
                : null;
        List<CallResponse.ParticipantSummary> participants = participantRepository.findByCallId(c.getId()).stream()
                .map(p -> CallResponse.ParticipantSummary.builder()
                        .userId(p.getUserId()).joinedAt(p.getJoinedAt()).leftAt(p.getLeftAt())
                        .ongoing(p.getJoinedAt() != null && p.getLeftAt() == null).build())
                .toList();
        return CallResponse.builder()
                .id(c.getId()).topic(c.getTopic()).roomName(c.getRoomName())
                .organisationId(c.getOrganisationId()).projectId(c.getProjectId()).hostUserId(c.getHostUserId())
                .status(c.getStatus()).scheduledAt(c.getScheduledAt())
                .startedAt(c.getStartedAt()).endedAt(c.getEndedAt()).createdAt(c.getCreatedAt())
                .participants(participants)
                .jitsiUrl(jitsiUrl).jwt(token)
                .build();
    }
}
