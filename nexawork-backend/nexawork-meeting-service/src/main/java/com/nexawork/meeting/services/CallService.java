package com.nexawork.meeting.services;

import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.CallParticipant;
import com.nexawork.meeting.entities.ExternalGuest;
import com.nexawork.meeting.entities.enums.CallStatus;
import com.nexawork.meeting.events.publishers.MeetingEventPublisher;
import com.nexawork.meeting.exceptions.ResourceNotFoundException;
import com.nexawork.meeting.properties.JitsiProperties;
import com.nexawork.meeting.repositories.CallRepository;
import com.nexawork.meeting.repositories.ExternalGuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CallService {

    private final CallRepository callRepo;
    private final ExternalGuestRepository guestRepo;
    private final JitsiTokenService jitsiTokenService;
    private final MeetingEventPublisher eventPublisher;
    private final JitsiProperties jitsiProperties;

    @Transactional
    public CallResponse createCall(CreateCallRequest request, Long organisationId,
                                   Long hostUserId, String hostEmail, String hostDisplayName) {
        String roomName = UUID.randomUUID().toString().replace("-", "");

        Call call = Call.builder()
            .topic(request.topic())
            .roomName(roomName)
            .organisationId(organisationId)
            .projectId(request.projectId())
            .hostUserId(hostUserId)
            .status(CallStatus.SCHEDULED)
            .scheduledAt(request.scheduledAt())
            .build();
        callRepo.save(call);

        String token = jitsiTokenService.generateToken(
            roomName, hostUserId, hostDisplayName, hostEmail, true);
        return toResponse(call, token);
    }

    @Transactional
    public CallResponse joinCall(Long callId, Long userId, String email, String displayName) {
        Call call = getOrThrow(callId);
        boolean alreadyIn = call.getParticipants().stream()
            .anyMatch(p -> p.getUserId().equals(userId));
        if (!alreadyIn) {
            call.getParticipants().add(CallParticipant.builder()
                .call(call).userId(userId).joinedAt(LocalDateTime.now()).build());
        }
        if (call.getStatus() == CallStatus.SCHEDULED) {
            call.setStatus(CallStatus.ACTIVE);
            call.setStartedAt(LocalDateTime.now());
        }
        callRepo.save(call);

        boolean isModerator = call.getHostUserId().equals(userId);
        String token = jitsiTokenService.generateToken(
            call.getRoomName(), userId, displayName, email, isModerator);
        return toResponse(call, token);
    }

    @Transactional
    public void endCall(Long callId, Long userId) {
        Call call = getOrThrow(callId);
        call.setStatus(CallStatus.ENDED);
        call.setEndedAt(LocalDateTime.now());
        callRepo.save(call);

        long durationSeconds = 0;
        if (call.getStartedAt() != null) {
            durationSeconds = java.time.Duration.between(
                call.getStartedAt(), call.getEndedAt()).getSeconds();
        }
        eventPublisher.publishCallEnded(call, durationSeconds);
    }

    @Transactional
    public void inviteGuest(Long callId, InviteGuestRequest request, Long inviterUserId) {
        Call call = getOrThrow(callId);
        String guestToken = UUID.randomUUID().toString();
        ExternalGuest guest = ExternalGuest.builder()
            .call(call)
            .email(request.email())
            .displayName(request.displayName())
            .guestToken(guestToken)
            .build();
        guestRepo.save(guest);
        eventPublisher.publishExternalGuestInvited(call, guest, inviterUserId);
    }

    @Transactional(readOnly = true)
    public List<CallResponse> findByOrganisation(Long organisationId) {
        return callRepo.findByOrganisationId(organisationId).stream()
            .map(c -> toResponse(c, null)).collect(Collectors.toList());
    }

    private Call getOrThrow(Long id) {
        return callRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Appel introuvable : " + id));
    }

    private CallResponse toResponse(Call c, String token) {
        String jitsiUrl = token != null
            ? jitsiProperties.getUrl() + "/" + c.getRoomName() + "?jwt=" + token
            : null;
        return new CallResponse(c.getId(), c.getTopic(), c.getRoomName(),
            c.getOrganisationId(), c.getProjectId(), c.getHostUserId(),
            c.getStatus(), c.getScheduledAt(), c.getStartedAt(), c.getCreatedAt(),
            token, jitsiUrl);
    }
}
