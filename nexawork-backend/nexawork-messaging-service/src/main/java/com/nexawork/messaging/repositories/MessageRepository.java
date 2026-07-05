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

    // Pagination par curseur en deux variantes (première page / avant curseur) pour
    // éviter le paramètre non typé dans `(:before IS NULL OR ...)` — PostgreSQL ne
    // peut pas inférer le type quand le paramètre est null (erreur SQLGrammar).

    @Query("""
            SELECT m FROM Message m
            WHERE m.channel.id = :channelId AND m.isDeleted = false
            ORDER BY m.sentAt DESC
            """)
    List<Message> findChannelFirstPage(@Param("channelId") UUID channelId, Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.channel.id = :channelId AND m.isDeleted = false AND m.sentAt < :before
            ORDER BY m.sentAt DESC
            """)
    List<Message> findChannelBefore(@Param("channelId") UUID channelId,
                                    @Param("before") LocalDateTime before, Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId AND m.isDeleted = false
            ORDER BY m.sentAt DESC
            """)
    List<Message> findConversationFirstPage(@Param("conversationId") UUID conversationId, Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId AND m.isDeleted = false AND m.sentAt < :before
            ORDER BY m.sentAt DESC
            """)
    List<Message> findConversationBefore(@Param("conversationId") UUID conversationId,
                                         @Param("before") LocalDateTime before, Pageable pageable);

    List<Message> findByChannelIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(UUID channelId);

    List<Message> findByConversationIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(UUID conversationId);
}
