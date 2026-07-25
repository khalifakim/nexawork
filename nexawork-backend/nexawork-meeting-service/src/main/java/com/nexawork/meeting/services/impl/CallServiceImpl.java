package com.nexawork.meeting.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.meeting.dtos.responses.JaasDiagnosticResponse;
import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.CallParticipant;
import com.nexawork.meeting.entities.MeetingHidden;
import com.nexawork.meeting.entities.enums.CallStatus;
import com.nexawork.meeting.events.publishers.CallEndedEvent;
import com.nexawork.meeting.events.publishers.MeetingEventPublisher;
import com.nexawork.meeting.events.publishers.MeetingParticipantInvitedEvent;
import com.nexawork.meeting.properties.MeetingProperties;
import com.nexawork.meeting.repositories.CallParticipantRepository;
import com.nexawork.meeting.repositories.CallRepository;
import com.nexawork.meeting.repositories.MeetingHiddenRepository;
import com.nexawork.meeting.security.CallerContext;
import com.nexawork.meeting.services.CallService;
import com.nexawork.meeting.services.video.RoomAccess;
import com.nexawork.meeting.services.video.VideoConferenceProvider;
import com.nexawork.meeting.services.video.VideoProviderDiagnostic;
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
 * Appels (§13.6). REF A appliqué à create/join ; jeton d'accès et URL de salle
 * obtenus via le port {@link VideoConferenceProvider} (fournisseur de visioconférence
 * abstrait) ; {@code call.ended} publié à la fin.
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
    VideoConferenceProvider videoProvider;
    MeetingEventPublisher eventPublisher;
    MeetingProperties meetingProperties;
    CallerContext caller;

    @Override
    public CallResponse create(CreateCallRequest request) {
        UUID host = caller.userId();
        requireNotAlreadyInCall(host); // REF A

        Call call = callRepository.save(Call.builder()
                .topic(request.getTopic())
                .roomName(generateRoomName())
                .organisationId(caller.organisationId())
                .hostUserId(host)
                .status(CallStatus.ACTIVE)
                .startedAt(LocalDateTime.now())
                .build());

        // L'hôte est participant modérateur, convié explicitement — mais PAS encore
        // « entré » : il ne l'est qu'en rejoignant réellement la salle (join()).
        // Poser joinedAt ici le faisait compter comme « déjà en appel » (REF A) dès
        // la création : si la salle ne s'ouvrait pas, il restait bloqué en 409
        // ALREADY_IN_CALL sur toute création suivante, sans aucun moyen de sortir.
        participantRepository.save(CallParticipant.builder()
                .call(call).userId(host)
                .invitedExplicitly(true).build());

        // Membres internes conviés dès la création (Lot M1, optionnel).
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            notifyInvited(call, request.getMemberIds());
        }

        // L'hôte est modérateur et contourne la salle d'attente (M3).
        String token = videoProvider.issueAccessToken(new RoomAccess(call.getRoomName(), host,
                caller.displayName(), null, true, true));
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

        boolean isHost = call.getHostUserId().equals(me);

        // Seuls l'hôte et les membres CONVIÉS entrent. Auparavant, un participant
        // était créé à la volée pour quiconque connaissait l'identifiant de l'appel
        // (`orElseGet`) : un membre du workspace non convié — qui ne voit pourtant
        // pas l'appel dans `activeCalls()` — pouvait le rejoindre en forgeant la
        // requête. Mesuré : `join` répondait 200. On répond 404 (et non 403) pour
        // ne pas révéler l'existence de la réunion, comme le fait déjà `loadInOrg`.
        CallParticipant participant = participantRepository.findByCallIdAndUserId(callId, me)
                .orElseThrow(() -> new ResourceNotFoundException("Appel introuvable."));
        if (!isHost && !Boolean.TRUE.equals(participant.getInvitedExplicitly())) {
            throw new ResourceNotFoundException("Appel introuvable.");
        }
        participant.setJoinedAt(LocalDateTime.now());
        participant.setLeftAt(null);
        participantRepository.save(participant);

        // Tout membre CONVIÉ entre directement dans la salle (façon WhatsApp) : il
        // s'est déjà authentifié sur la plateforme et a été invité explicitement,
        // une validation manuelle du modérateur n'apporterait rien.
        // Seul l'INVITÉ EXTERNE, qui n'a pas de compte, passe par la salle
        // d'attente (GuestService : lobbyBypass = false).
        String token = videoProvider.issueAccessToken(new RoomAccess(call.getRoomName(), me,
                caller.displayName(), null, isHost, true));
        return toResponse(call, token);
    }

    /**
     * Quitte l'appel. **L'appel se clôt de lui-même** quand plus personne n'est
     * présent : sans cela il restait `ACTIVE` indéfiniment (bannière « Appel en
     * cours » perpétuelle, et REF A refusant toute réunion suivante).
     */
    @Override
    public void leave(UUID callId) {
        UUID me = caller.userId();
        Call call = loadInOrg(callId);
        participantRepository.findByCallIdAndUserId(callId, me).ifPresent(p -> {
            p.setLeftAt(LocalDateTime.now());
            participantRepository.save(p);
        });

        if (call.getStatus() != CallStatus.ACTIVE) {
            return;
        }
        // Plus aucun participant entré et non reparti → la réunion est finie.
        boolean someoneStillIn = participantRepository.findByCallId(callId).stream()
                .anyMatch(p -> p.getJoinedAt() != null && p.getLeftAt() == null);
        if (!someoneStillIn) {
            endCall(call);
        }
    }

    @Override
    public void end(UUID callId) {
        Call call = loadInOrg(callId);
        // L'hôte ou un administrateur peut clore l'appel pour tout le monde.
        if (!call.getHostUserId().equals(caller.userId()) && !caller.isWorkspaceAdmin()) {
            throw new com.nexawork.commons.exceptions.ForbiddenException(
                    "Seul l'hôte ou un administrateur peut terminer l'appel.");
        }
        endCall(call);
    }

    /** Clôture effective : statut, sortie de tous les présents, événement `call.ended`. */
    private void endCall(Call call) {
        LocalDateTime now = LocalDateTime.now();
        // Transition ATOMIQUE ACTIVE → ENDED : un seul thread réussit (lignes = 1) et
        // publiera call.ended. Les appels concurrents (hôte qui termine + dernier
        // participant qui part, départs simultanés) obtiennent 0 et s'arrêtent là,
        // ce qui supprime les notifications « réunion terminée » en double.
        if (callRepository.markEndedIfActive(call.getId(), now) == 0) {
            return;
        }
        call.setStatus(CallStatus.ENDED);
        call.setEndedAt(now);

        // Tous les participants encore présents quittent.
        participantRepository.findByCallId(call.getId()).stream()
                .filter(p -> p.getLeftAt() == null)
                .forEach(p -> { p.setLeftAt(now); participantRepository.save(p); });

        long durationSeconds = call.getStartedAt() != null
                ? Duration.between(call.getStartedAt(), now).getSeconds() : 0;
        eventPublisher.publishCallEnded(new CallEndedEvent(
                call.getId(), call.getTopic(), call.getRoomName(),
                call.getOrganisationId(), call.getHostUserId(), durationSeconds));
        log.info("Appel {} terminé (durée {}s)", call.getId(), durationSeconds);
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
    public void inviteParticipants(UUID callId, List<UUID> userIds) {
        Call call = loadInOrg(callId);
        if (call.getStatus() != CallStatus.ACTIVE) {
            throw new ConflictException("Cet appel n'est pas actif.");
        }
        notifyInvited(call, userIds);
    }

    /**
     * Appels « en cours » de l'appelant (bannière). Un appel ne compte que si
     * **au moins un participant est réellement présent** (joined, pas encore left) :
     * sans cela, un appel créé puis abandonné (hôte qui ne rejoint jamais, ou
     * fermeture sans {@code leave} propre) restait ACTIVE → bannière perpétuelle,
     * visible même après reconnexion (§13). Au passage, on **clôt** les appels
     * ACTIVE que plus personne n'occupe (nettoyage paresseux) — avec une période de
     * grâce pour ne pas fermer un appel à peine créé dont l'hôte ouvre la salle.
     */
    @Override
    @Transactional
    public List<CallResponse> activeCalls() {
        UUID me = caller.userId();
        LocalDateTime now = LocalDateTime.now();
        List<Call> calls = callRepository.findByOrganisationIdOrderByCreatedAtDesc(caller.organisationId());
        for (Call c : calls) {
            if (c.getStatus() != CallStatus.ACTIVE || anyoneCurrentlyIn(c.getId())) {
                continue;
            }
            // Personne dedans : clôture si passé la grâce de 2 min (le temps que l'hôte
            // rejoigne), OU appel anormalement vieux (filet de sécurité, ex. crash).
            boolean pastGrace = c.getCreatedAt() == null || c.getCreatedAt().isBefore(now.minusMinutes(2));
            boolean tooOld = c.getCreatedAt() != null && c.getCreatedAt().isBefore(now.minusHours(12));
            if (pastGrace || tooOld) {
                endCall(c);
            }
        }
        return calls.stream()
                .filter(c -> c.getStatus() == CallStatus.ACTIVE && anyoneCurrentlyIn(c.getId()))
                .filter(c -> c.getHostUserId().equals(me)
                        || participantRepository.findByCallIdAndUserId(c.getId(), me).isPresent())
                .map(c -> toResponse(c, null))
                .toList();
    }

    /** Vrai si au moins un participant est actuellement dans l'appel (joined, pas left). */
    private boolean anyoneCurrentlyIn(UUID callId) {
        return participantRepository.findByCallId(callId).stream()
                .anyMatch(p -> p.getJoinedAt() != null && p.getLeftAt() == null);
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

    /**
     * Filet de sécurité du cycle de vie (cf. {@link CallService#sweepStaleCalls()}).
     * {@code leave()} ne clôt l'appel que lorsqu'un participant *entré* en repart :
     * si l'hôte crée l'appel et n'entre jamais dans la salle, plus personne ne
     * déclenche jamais la clôture et l'appel reste ACTIVE à vie. Ce balayage est
     * le seul mécanisme qui rattrape ce cas.
     */
    @Override
    public void sweepStaleCalls() {
        LocalDateTime now = LocalDateTime.now();
        Duration abandonAfter = Duration.ofMinutes(meetingProperties.getAbandonTimeoutMinutes());
        Duration maxDuration = Duration.ofHours(meetingProperties.getMaxDurationHours());

        for (Call call : callRepository.findByStatus(CallStatus.ACTIVE)) {
            LocalDateTime start = call.getStartedAt() != null ? call.getStartedAt() : call.getCreatedAt();

            if (start != null && Duration.between(start, now).compareTo(maxDuration) > 0) {
                log.info("Appel {} clos d'office : durée maximale de {} h dépassée.",
                        call.getId(), meetingProperties.getMaxDurationHours());
                endCall(call);
                continue;
            }

            List<CallParticipant> participants = participantRepository.findByCallId(call.getId());
            boolean someoneStillIn = participants.stream()
                    .anyMatch(p -> p.getJoinedAt() != null && p.getLeftAt() == null);
            if (someoneStillIn) {
                continue;
            }

            // Salle vide : depuis le départ du dernier présent, ou — si personne
            // n'est jamais entré — depuis le début de l'appel.
            LocalDateTime emptySince = participants.stream()
                    .map(CallParticipant::getLeftAt)
                    .filter(java.util.Objects::nonNull)
                    .max(LocalDateTime::compareTo)
                    .orElse(start);

            if (emptySince != null && Duration.between(emptySince, now).compareTo(abandonAfter) > 0) {
                log.info("Appel {} clos d'office : salle vide depuis plus de {} min.",
                        call.getId(), meetingProperties.getAbandonTimeoutMinutes());
                endCall(call);
            }
        }
    }

    /**
     * Diagnostic JaaS. Réservé aux administrateurs : la clé publique n'est pas un
     * secret, mais la configuration du tenant n'a pas à circuler auprès de tous.
     */
    @Override
    @Transactional(readOnly = true)
    public JaasDiagnosticResponse jaasDiagnostic() {
        if (!caller.isWorkspaceAdmin()) {
            throw new ForbiddenException("Diagnostic réservé aux administrateurs et au propriétaire.");
        }
        // Salle factice : le jeton d'exemple n'ouvre aucune réunion réelle, il sert
        // uniquement à faire lire ses claims (jwt.io).
        VideoProviderDiagnostic diag = videoProvider.diagnostic(new RoomAccess(
                "diagnostic-" + generateRoomName(), caller.userId(), caller.displayName(), null, true, true));
        return JaasDiagnosticResponse.builder()
                .appId(diag.appId())
                .apiKeyId(diag.apiKeyId())
                .kidMatchesAppId(diag.kidMatchesAppId())
                .keySizeBits(diag.keySizeBits())
                .publicKeyFingerprint(diag.publicKeyFingerprint())
                .publicKeyPem(diag.publicKeyPem())
                .serverTimeUtc(java.time.Instant.now().toString())
                .sampleToken(diag.sampleToken())
                .build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Ajoute des membres internes comme participants conviés (non encore joints) et
     * publie un {@code meeting.participant.invited} par destinataire (→ notif « en cours »).
     * Ignore l'appelant lui-même et les membres déjà participants.
     */
    private void notifyInvited(Call call, List<UUID> userIds) {
        UUID inviter = caller.userId();
        String inviterName = caller.displayName();
        userIds.stream().distinct()
                .filter(uid -> uid != null && !uid.equals(inviter))
                .filter(uid -> participantRepository.findByCallIdAndUserId(call.getId(), uid).isEmpty())
                .forEach(uid -> {
                    participantRepository.save(CallParticipant.builder()
                            .call(call).userId(uid).invitedExplicitly(true).build());
                    eventPublisher.publish(MeetingEventPublisher.ROUTING_PARTICIPANT_INVITED,
                            new MeetingParticipantInvitedEvent(call.getId(), call.getTopic(),
                                    call.getOrganisationId(),
                                    inviter, inviterName, uid),
                            "membre " + uid);
                });
    }

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
        String jitsiUrl = videoProvider.buildRoomUrl(c.getRoomName(), token);
        List<CallResponse.ParticipantSummary> participants = participantRepository.findByCallId(c.getId()).stream()
                .map(p -> CallResponse.ParticipantSummary.builder()
                        .userId(p.getUserId()).joinedAt(p.getJoinedAt()).leftAt(p.getLeftAt())
                        .ongoing(p.getJoinedAt() != null && p.getLeftAt() == null).build())
                .toList();
        return CallResponse.builder()
                .id(c.getId()).topic(c.getTopic()).roomName(c.getRoomName())
                .organisationId(c.getOrganisationId()).hostUserId(c.getHostUserId())
                .status(c.getStatus())
                .startedAt(c.getStartedAt()).endedAt(c.getEndedAt()).createdAt(c.getCreatedAt())
                .participants(participants)
                .jitsiUrl(jitsiUrl).jwt(token)
                .build();
    }
}
