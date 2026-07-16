package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.requests.ChannelAccessRequest;
import com.nexawork.messaging.dtos.requests.CreateChannelRequest;
import com.nexawork.messaging.dtos.requests.UpdateChannelRequest;
import com.nexawork.messaging.dtos.responses.ChannelMemberResponse;
import com.nexawork.messaging.dtos.responses.ChannelResponse;

import java.util.List;
import java.util.UUID;

/**
 * Canaux (§13.5, §12). REF F (privés filtrés → 404/absents), REF D (écriture
 * readonly), R14 (création org = ADMIN+OWNER).
 */
public interface ChannelService {

    /** Liste les canaux visibles : {@code projectId} nul = canaux organisation. */
    List<ChannelResponse> listChannels(UUID projectId);

    ChannelResponse createChannel(CreateChannelRequest request);

    ChannelResponse getChannel(UUID channelId);

    ChannelResponse updateChannel(UUID channelId, UpdateChannelRequest request);

    void deleteChannel(UUID channelId);

    /** Marque le canal comme lu par l'appelant (remet le compteur de non-lus à zéro). */
    void markRead(UUID channelId);

    List<ChannelMemberResponse> getAccess(UUID channelId);

    List<ChannelMemberResponse> updateAccess(UUID channelId, ChannelAccessRequest request);
}
