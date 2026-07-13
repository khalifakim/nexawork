package com.nexawork.messaging.services.impl;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.messaging.dtos.requests.ChannelAccessRequest;
import com.nexawork.messaging.dtos.requests.CreateChannelRequest;
import com.nexawork.messaging.dtos.requests.UpdateChannelRequest;
import com.nexawork.messaging.dtos.responses.ChannelMemberResponse;
import com.nexawork.messaging.dtos.responses.ChannelResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.ChannelMember;
import com.nexawork.messaging.entities.enums.ChannelAccessLevel;
import com.nexawork.messaging.entities.enums.ChannelIcon;
import com.nexawork.messaging.entities.enums.ChannelType;
import com.nexawork.messaging.mappers.ChannelMapper;
import com.nexawork.messaging.repositories.ChannelMemberRepository;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import com.nexawork.messaging.security.CallerContext;
import com.nexawork.messaging.services.ChannelAccessGuard;
import com.nexawork.messaging.services.ChannelService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Canaux (§13.5). REF F / REF D / R14. Les canaux d'un projet archivé sont
 * dérivés du statut projet côté requête (non enforçable ici — best-effort).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChannelServiceImpl implements ChannelService {

    ChannelRepository channelRepository;
    ChannelMemberRepository channelMemberRepository;
    MessageRepository messageRepository;
    ChannelMapper channelMapper;
    ChannelAccessGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<ChannelResponse> listChannels(UUID projectId) {
        List<Channel> channels = projectId != null
                ? channelRepository.findByProjectId(projectId)
                : channelRepository.findByOrganisationIdAndChannelType(caller.organisationId(), ChannelType.GLOBAL_ORG);
        // REF F : ne retourne que les canaux visibles par l'appelant.
        return channels.stream().filter(guard::canView).map(this::toDto).toList();
    }

    @Override
    public ChannelResponse createChannel(CreateChannelRequest request) {
        boolean isOrgChannel = request.getProjectId() == null;
        guard.requireCanCreate(isOrgChannel, "créer un canal"); // R14

        boolean isPrivate = Boolean.TRUE.equals(request.getIsPrivate());
        Channel channel = channelRepository.save(Channel.builder()
                .name(request.getName())
                .icon(request.getIcon() != null ? request.getIcon() : ChannelIcon.HASH)
                .channelType(isOrgChannel ? ChannelType.GLOBAL_ORG : ChannelType.PROJECT)
                .organisationId(caller.organisationId())
                .projectId(request.getProjectId())
                .createdByUserId(caller.userId())
                .isSystem(false)
                .readonly(Boolean.TRUE.equals(request.getReadonly()))
                .isPrivate(isPrivate)
                .build());

        if (isPrivate && request.getMemberUserIds() != null) {
            addMembers(channel, request.getMemberUserIds());
        }
        return toDto(channel);
    }

    @Override
    @Transactional(readOnly = true)
    public ChannelResponse getChannel(UUID channelId) {
        return toDto(guard.requireViewable(channelId)); // REF F : 404 si non visible
    }

    @Override
    public ChannelResponse updateChannel(UUID channelId, UpdateChannelRequest request) {
        Channel channel = guard.loadInOrg(channelId);
        guard.requireManage(channel, "modifier le canal"); // §13.5 PATCH

        if (request.getName() != null && !request.getName().isBlank()) {
            channel.setName(request.getName());
        }
        if (request.getIcon() != null) {
            channel.setIcon(request.getIcon());
        }
        if (request.getReadonly() != null) {
            channel.setReadonly(request.getReadonly());
        }
        return toDto(channelRepository.save(channel));
    }

    @Override
    public void deleteChannel(UUID channelId) {
        Channel channel = guard.loadInOrg(channelId);
        guard.requireManage(channel, "supprimer le canal");
        channelRepository.delete(channel); // cascade : membres + messages
        log.info("Canal {} supprimé par {}", channelId, caller.userId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelMemberResponse> getAccess(UUID channelId) {
        Channel channel = guard.loadInOrg(channelId);
        guard.requireManage(channel, "consulter les accès");
        return channelMapper.parseMembers(channelMemberRepository.findByChannelId(channelId));
    }

    @Override
    public List<ChannelMemberResponse> updateAccess(UUID channelId, ChannelAccessRequest request) {
        Channel channel = guard.loadInOrg(channelId);
        guard.requireManage(channel, "modifier les accès");

        channel.setIsPrivate(request.getIsPrivate());
        channelRepository.save(channel);

        // Réinitialise la liste des membres autorisés.
        channelMemberRepository.deleteAll(channelMemberRepository.findByChannelId(channelId));
        if (Boolean.TRUE.equals(request.getIsPrivate()) && request.getMemberUserIds() != null) {
            addMembers(channel, request.getMemberUserIds());
        }
        return channelMapper.parseMembers(channelMemberRepository.findByChannelId(channelId));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private void addMembers(Channel channel, List<UUID> userIds) {
        for (UUID userId : userIds) {
            if (userId == null) {
                throw new InvalidRequestException("Identifiant de membre invalide.");
            }
            if (!channelMemberRepository.existsByChannelIdAndUserId(channel.getId(), userId)) {
                channelMemberRepository.save(ChannelMember.builder()
                        .channel(channel)
                        .userId(userId)
                        .accessLevel(ChannelAccessLevel.EDITOR)
                        .build());
            }
        }
    }

    private ChannelResponse toDto(Channel channel) {
        ChannelResponse dto = channelMapper.asDto(channel);
        dto.setCanWrite(guard.canWrite(channel));
        // Canal privé : nombre de bénéficiaires explicites. Canal ouvert : null —
        // l'accès vaut pour tous les membres du workspace (portés par l'Auth Service),
        // le frontend affiche alors « Tous les membres ».
        dto.setMemberCount(Boolean.TRUE.equals(channel.getIsPrivate())
                ? (int) channelMemberRepository.countByChannelId(channel.getId())
                : null);
        dto.setLastActivityAt(messageRepository.findLastActivityAt(channel.getId()));
        return dto;
    }
}
