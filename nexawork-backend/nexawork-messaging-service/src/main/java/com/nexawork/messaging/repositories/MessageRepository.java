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
            WHERE m.channel.id = :channelId
            ORDER BY m.sentAt DESC
            """)
    List<Message> findChannelFirstPage(@Param("channelId") UUID channelId, Pageable pageable);

    /** Date du dernier message d'un canal (dernière activité) — null si vide. */
    @Query("""
            SELECT MAX(m.sentAt) FROM Message m
            WHERE m.channel.id = :channelId AND m.isDeleted = false
            """)
    LocalDateTime findLastActivityAt(@Param("channelId") UUID channelId);

    @Query("""
            SELECT m FROM Message m
            WHERE m.channel.id = :channelId AND m.sentAt < :before
            ORDER BY m.sentAt DESC
            """)
    List<Message> findChannelBefore(@Param("channelId") UUID channelId,
                                    @Param("before") LocalDateTime before, Pageable pageable);

    // `since` = `cleared_at` de l'appelant (ou un plancher epoch s'il n'a jamais
    // supprimé) : ne renvoie que les messages POSTÉRIEURS. Toujours NON NULL — sinon
    // PostgreSQL n'arrive pas à typer un paramètre utilisé seulement dans `? IS NULL`.
    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.sentAt > :since
            ORDER BY m.sentAt DESC
            """)
    List<Message> findConversationFirstPage(@Param("conversationId") UUID conversationId,
                                            @Param("since") LocalDateTime since, Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId AND m.sentAt < :before
              AND m.sentAt > :since
            ORDER BY m.sentAt DESC
            """)
    List<Message> findConversationBefore(@Param("conversationId") UUID conversationId,
                                         @Param("before") LocalDateTime before,
                                         @Param("since") LocalDateTime since, Pageable pageable);

    /** Existe-t-il un message postérieur à `sentAt` ? (réapparition d'une conversation supprimée). */
    boolean existsByConversationIdAndSentAtAfter(UUID conversationId, LocalDateTime sentAt);

    /** Purge des messages d'une conversation (suppression définitive). */
    void deleteByConversationId(UUID conversationId);

    List<Message> findByChannelIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(UUID channelId);

    List<Message> findByConversationIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(UUID conversationId);

    /**
     * Vrai nombre de messages non lus d'une conversation pour l'appelant :
     * messages reçus (envoyés par l'autre participant) encore sans {@code readAt}.
     * Remplace l'ancien booléen {@code conversation_participants.is_read}, jamais
     * remis à jour après la création (badge figé à « 1 »).
     */
    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.isDeleted = false
              AND m.senderUserId <> :userId
              AND m.readAt IS NULL
              AND m.sentAt > :since
            """)
    long countUnreadInConversation(@Param("conversationId") UUID conversationId,
                                   @Param("userId") UUID userId,
                                   @Param("since") LocalDateTime since);

    /** Messages d'un canal non postés par l'appelant (canal jamais ouvert = tout est non lu). */
    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE m.channel.id = :channelId AND m.isDeleted = false AND m.senderUserId <> :userId
            """)
    long countChannelMessagesFromOthers(@Param("channelId") UUID channelId,
                                        @Param("userId") UUID userId);

    /** Messages d'un canal postés APRÈS la dernière lecture, par d'autres que l'appelant. */
    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE m.channel.id = :channelId AND m.isDeleted = false
              AND m.senderUserId <> :userId AND m.sentAt > :since
            """)
    long countChannelUnreadSince(@Param("channelId") UUID channelId,
                                 @Param("userId") UUID userId,
                                 @Param("since") LocalDateTime since);

    /**
     * Recherche globale (§4.8) : messages dont le contenu contient le terme, dans
     * les **fils accessibles à l'appelant** — canaux du workspace (visibilité REF F
     * appliquée en aval) ou conversations dont il est participant.
     */
    @Query("""
            SELECT m FROM Message m
            LEFT JOIN FETCH m.channel c
            WHERE m.isDeleted = false
              AND LOWER(m.content) LIKE LOWER(CONCAT('%', :q, '%'))
              AND (
                    (c IS NOT NULL AND c.organisationId = :orgId)
                 OR (m.conversationId IS NOT NULL
                     AND EXISTS (SELECT 1 FROM ConversationParticipant p
                                 WHERE p.conversation.id = m.conversationId
                                   AND p.userId = :userId))
              )
            ORDER BY m.sentAt DESC
            """)
    List<Message> search(@Param("orgId") UUID orgId,
                         @Param("userId") UUID userId,
                         @Param("q") String q,
                         Pageable pageable);
}
