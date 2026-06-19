package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.requests.CreateChannelRequest;
import com.nexawork.messaging.dtos.responses.ChannelResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.ChannelMember;
import com.nexawork.messaging.entities.enums.ChannelType;
import com.nexawork.messaging.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.repositories.ChannelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChannelService {

    private final ChannelRepository channelRepo;

    @Transactional
    public ChannelResponse create(CreateChannelRequest request, Long organisationId, Long userId) {
        Channel channel = Channel.builder()
            .name(request.name())
            .channelType(request.channelType() != null ? request.channelType() : ChannelType.GLOBAL_ORG)
            .organisationId(organisationId)
            .projectId(request.projectId())
            .createdByUserId(userId)
            .build();

        ChannelMember member = ChannelMember.builder()
            .channel(channel)
            .userId(userId)
            .build();
        channel.getMembers().add(member);

        channelRepo.save(channel);
        return toResponse(channel);
    }

    @Transactional(readOnly = true)
    public List<ChannelResponse> findByOrganisation(Long organisationId) {
        return channelRepo.findByOrganisationId(organisationId).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChannelResponse findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public void join(Long channelId, Long userId) {
        Channel channel = getOrThrow(channelId);
        boolean alreadyMember = channel.getMembers().stream()
            .anyMatch(m -> m.getUserId().equals(userId));
        if (!alreadyMember) {
            channel.getMembers().add(ChannelMember.builder().channel(channel).userId(userId).build());
            channelRepo.save(channel);
        }
    }

    private Channel getOrThrow(Long id) {
        return channelRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Canal introuvable : " + id));
    }

    private ChannelResponse toResponse(Channel c) {
        return new ChannelResponse(c.getId(), c.getName(), c.getChannelType(),
            c.getOrganisationId(), c.getProjectId(), c.getCreatedByUserId(), c.getCreatedAt());
    }
}
