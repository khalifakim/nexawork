package com.nexawork.messaging.mappers;

import com.nexawork.messaging.dtos.responses.ChannelMemberResponse;
import com.nexawork.messaging.dtos.responses.ChannelResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.ChannelMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * Channel → ChannelResponse. {@code canWrite} est renseigné en service (dépend
 * du rôle de l'appelant + readonly, REF D).
 */
@Mapper(componentModel = "spring")
public interface ChannelMapper {

    @Mapping(target = "canWrite", ignore = true)
    ChannelResponse asDto(Channel entity);

    ChannelMemberResponse asMemberDto(ChannelMember entity);

    List<ChannelMemberResponse> parseMembers(List<ChannelMember> entities);
}
