package com.nexawork.meeting.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.responses.GuestAccessResponse;
import com.nexawork.meeting.dtos.responses.GuestInviteResponse;
import com.nexawork.meeting.dtos.responses.MeetingFileResponse;
import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.ExternalGuest;
import com.nexawork.meeting.entities.MeetingFile;
import com.nexawork.meeting.entities.enums.CallStatus;
import com.nexawork.meeting.events.publishers.ExternalGuestInvitedEvent;
import com.nexawork.meeting.events.publishers.MeetingEventPublisher;
import com.nexawork.meeting.properties.JitsiProperties;
import com.nexawork.meeting.properties.MeetingProperties;
import com.nexawork.meeting.repositories.CallRepository;
import com.nexawork.meeting.repositories.ExternalGuestRepository;
import com.nexawork.meeting.repositories.MeetingFileRepository;
import com.nexawork.meeting.security.CallerContext;
import com.nexawork.meeting.services.GuestService;
import com.nexawork.meeting.services.JitsiTokenService;
import com.nexawork.meeting.services.MeetingFileClient;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Invités externes (§13.6). Invitation + accès via token. L'accès invité génère
 * un token JaaS **non modérateur** et marque le token consommé (usage unique).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GuestServiceImpl implements GuestService {

    CallRepository callRepository;
    ExternalGuestRepository guestRepository;
    MeetingFileRepository fileRepository;
    MeetingFileClient fileClient;
    JitsiTokenService tokenService;
    MeetingEventPublisher eventPublisher;
    JitsiProperties jitsiProperties;
    MeetingProperties meetingProperties;
    CallerContext caller;

    @Override
    public GuestInviteResponse invite(UUID callId, InviteGuestRequest request) {
        Call call = loadInOrg(callId);
        String token = UUID.randomUUID().toString();

        ExternalGuest guest = guestRepository.save(ExternalGuest.builder()
                .call(call)
                .email(request.getEmail())
                .displayName(request.getDisplayName())
                .guestToken(token)
                .used(false)
                .build());

        // Publie external.guest.invited → Notification envoie l'email d'invitation.
        eventPublisher.publish(MeetingEventPublisher.ROUTING_GUEST_INVITED,
                new ExternalGuestInvitedEvent(call.getId(), call.getTopic(), request.getEmail(),
                        request.getDisplayName(), token, caller.userId()),
                "invité " + request.getEmail());

        String link = meetingProperties.getFrontendBaseUrl() + "/guest/" + token;
        log.info("Invité externe {} ajouté à l'appel {}", request.getEmail(), callId);
        return GuestInviteResponse.builder()
                .guestId(guest.getId()).email(guest.getEmail()).displayName(guest.getDisplayName())
                .guestToken(token).guestLink(link).build();
    }

    @Override
    public GuestAccessResponse access(String guestToken) {
        ExternalGuest guest = guestRepository.findByGuestToken(guestToken)
                .orElseThrow(() -> new ResourceNotFoundException("Lien d'invité invalide."));
        if (Boolean.TRUE.equals(guest.getUsed())) {
            throw new ConflictException("Ce lien d'invitation a déjà été utilisé.");
        }
        Call call = guest.getCall();
        if (call.getStatus() != CallStatus.ACTIVE) {
            throw new ConflictException("La réunion n'est pas active.");
        }

        // Token JaaS non modérateur pour l'invité (id null → "guest").
        String token = tokenService.generateToken(call.getRoomName(), null,
                guest.getDisplayName(), guest.getEmail(), false);
        guest.setUsed(true);
        guestRepository.save(guest);

        String jitsiUrl = jitsiProperties.getUrl() + "/" + jitsiProperties.getAppId()
                + "/" + call.getRoomName() + "?jwt=" + token;
        return GuestAccessResponse.builder()
                .callId(call.getId()).topic(call.getTopic()).displayName(guest.getDisplayName())
                .jitsiUrl(jitsiUrl).jwt(token).build();
    }

    // ─── Fichiers partagés (M5) — l'invité fait exactement comme les membres ────

    @Override
    @Transactional(readOnly = true)
    public List<MeetingFileResponse> files(String guestToken) {
        Call call = resolveGuest(guestToken).getCall();
        return fileRepository.findByCallIdOrderBySharedAtAsc(call.getId()).stream()
                .map(GuestServiceImpl::toDto)
                .toList();
    }

    /**
     * L'invité partage un fichier. Il n'a pas de JWT : le Meeting Service relaie
     * l'upload au File Service (→ MinIO) après avoir validé son token, puis
     * rattache la référence à l'appel — exactement comme pour un membre.
     */
    @Override
    public MeetingFileResponse shareFile(String guestToken, MultipartFile file) {
        ExternalGuest guest = resolveGuest(guestToken);
        Call call = guest.getCall();

        MeetingFileClient.Stored stored = fileClient.upload(
                file, call.getOrganisationId(), call.getId(), call.getHostUserId());

        return toDto(fileRepository.save(MeetingFile.builder()
                .call(call)
                .fileId(stored.id())
                .downloadUrl("/api/v1/files/" + stored.id() + "/download")
                .fileName(stored.originalName())
                .fileSize(stored.size())
                .contentType(stored.contentType())
                // `sharedBy` reste NUL : un invité externe n'a pas de compte, donc pas
                // d'UUID. Sa paternité est portée par le nom — on n'invente pas d'identité.
                .sharedByName(guest.getDisplayName())
                .build()));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadFile(String guestToken, UUID meetingFileId) {
        Call call = resolveGuest(guestToken).getCall();
        MeetingFile mf = requireFileOfCall(meetingFileId, call);
        return fileClient.download(mf.getFileId(), call.getOrganisationId(), call.getHostUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public String fileName(String guestToken, UUID meetingFileId) {
        Call call = resolveGuest(guestToken).getCall();
        return requireFileOfCall(meetingFileId, call).getFileName();
    }

    /** Le fichier doit appartenir À CETTE réunion : sinon le token deviendrait un passe-partout. */
    private MeetingFile requireFileOfCall(UUID meetingFileId, Call call) {
        MeetingFile mf = fileRepository.findById(meetingFileId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
        if (!mf.getCall().getId().equals(call.getId()) || mf.getFileId() == null) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        return mf;
    }

    /**
     * Résout l'invité par son token, pour les appels qui SUIVENT son entrée.
     *
     * <p>Contrairement à {@link #access(String)}, on n'exige pas ici que le token soit
     * vierge : il a justement été <b>consommé</b> à l'entrée dans la salle. Le refuser
     * ensuite empêcherait l'invité de voir ou partager le moindre fichier. La garde
     * qui compte est que la <b>réunion soit encore active</b> — un token périmé ne
     * donne donc accès à rien.</p>
     */
    private ExternalGuest resolveGuest(String guestToken) {
        ExternalGuest guest = guestRepository.findByGuestToken(guestToken)
                .orElseThrow(() -> new ResourceNotFoundException("Lien d'invité invalide."));
        if (guest.getCall().getStatus() != CallStatus.ACTIVE) {
            throw new ConflictException("La réunion n'est pas active.");
        }
        return guest;
    }

    private static MeetingFileResponse toDto(MeetingFile f) {
        return MeetingFileResponse.builder()
                .id(f.getId())
                .callId(f.getCall().getId())
                .fileId(f.getFileId())
                .downloadUrl(f.getDownloadUrl())
                .fileName(f.getFileName())
                .fileSize(f.getFileSize())
                .contentType(f.getContentType())
                .sharedBy(f.getSharedBy())
                .sharedByName(f.getSharedByName())
                .sharedAt(f.getSharedAt())
                .build();
    }

    private Call loadInOrg(UUID callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Appel introuvable."));
        if (!call.getOrganisationId().equals(caller.organisationId())) {
            throw new ResourceNotFoundException("Appel introuvable.");
        }
        return call;
    }
}
