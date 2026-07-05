package com.nexawork.meeting.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.responses.GuestAccessResponse;
import com.nexawork.meeting.dtos.responses.GuestInviteResponse;
import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.ExternalGuest;
import com.nexawork.meeting.entities.enums.CallStatus;
import com.nexawork.meeting.events.publishers.ExternalGuestInvitedEvent;
import com.nexawork.meeting.events.publishers.MeetingEventPublisher;
import com.nexawork.meeting.properties.JitsiProperties;
import com.nexawork.meeting.properties.MeetingProperties;
import com.nexawork.meeting.repositories.CallRepository;
import com.nexawork.meeting.repositories.ExternalGuestRepository;
import com.nexawork.meeting.security.CallerContext;
import com.nexawork.meeting.services.GuestService;
import com.nexawork.meeting.services.JitsiTokenService;
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

    private Call loadInOrg(UUID callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Appel introuvable."));
        if (!call.getOrganisationId().equals(caller.organisationId())) {
            throw new ResourceNotFoundException("Appel introuvable.");
        }
        return call;
    }
}
