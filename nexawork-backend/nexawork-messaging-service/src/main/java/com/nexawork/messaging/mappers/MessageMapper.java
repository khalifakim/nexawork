package com.nexawork.messaging.mappers;

import com.nexawork.messaging.dtos.responses.MentionResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageMention;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * Message → MessageResponse. {@code channelId} aplati ; {@code mentions} renseigné
 * en service.
 */
@Mapper(componentModel = "spring")
public interface MessageMapper {

    @Mapping(target = "channelId", expression = "java(entity.getChannel() != null ? entity.getChannel().getId() : null)")
    @Mapping(target = "mentions", ignore = true)
    MessageResponse asDto(Message entity);

    @Mapping(target = "messageId", source = "message.id")
    @Mapping(target = "authorUserId", source = "message.senderUserId")
    @Mapping(target = "messageContent", source = "message.content")
    @Mapping(target = "channelId", source = "message.channel.id")
    @Mapping(target = "channelName", source = "message.channel.name")
    @Mapping(target = "conversationId", source = "message.conversationId")
    MentionResponse asMentionDto(MessageMention entity);

    List<MentionResponse> parseMentions(List<MessageMention> entities);
}
