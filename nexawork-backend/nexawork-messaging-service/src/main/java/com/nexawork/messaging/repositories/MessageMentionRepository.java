package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageMentionRepository extends JpaRepository<MessageMention, Long> {

    List<MessageMention> findByMessageId(Long messageId);

    List<MessageMention> findByTargetIdAndMentionType(Long targetId, MentionType mentionType);
}
