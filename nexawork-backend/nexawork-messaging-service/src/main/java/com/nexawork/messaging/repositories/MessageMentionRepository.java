package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.MessageMention;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageMentionRepository extends JpaRepository<MessageMention, UUID> {

    List<MessageMention> findByMessageId(UUID messageId);

    /** Mentions USER ciblant l'utilisateur (vue « Mentions reçues »). */
    List<MessageMention> findByTargetIdAndMentionType(UUID targetId,
            com.nexawork.messaging.entities.enums.MentionType mentionType);
}
