package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    /** Page de messages d'un canal, plus anciens qu'un curseur (pagination descendante). */
    @Query("""
            SELECT m FROM Message m
            WHERE m.channel.id = :channelId AND m.isDeleted = false
              AND (:before IS NULL OR m.sentAt < :before)
            ORDER BY m.sentAt DESC
            """)
    List<Message> findChannelPage(@Param("channelId") UUID channelId,
                                  @Param("before") LocalDateTime before, Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId AND m.isDeleted = false
              AND (:before IS NULL OR m.sentAt < :before)
            ORDER BY m.sentAt DESC
            """)
    List<Message> findConversationPage(@Param("conversationId") UUID conversationId,
                                       @Param("before") LocalDateTime before, Pageable pageable);

    List<Message> findByChannelIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(UUID channelId);

    List<Message> findByConversationIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(UUID conversationId);
}
