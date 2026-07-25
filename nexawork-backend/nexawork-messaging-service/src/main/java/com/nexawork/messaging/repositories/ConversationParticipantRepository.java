package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationParticipantRepository
        extends JpaRepository<ConversationParticipant, ConversationParticipant.ParticipantId> {

    List<ConversationParticipant> findByConversationId(UUID conversationId);

    boolean existsByConversationIdAndUserId(UUID conversationId, UUID userId);

    /** Le participant (un utilisateur) d'une conversation — porte son {@code clearedAt}. */
    Optional<ConversationParticipant> findByConversationIdAndUserId(UUID conversationId, UUID userId);

    /** Purge des participants d'une conversation (suppression définitive). */
    void deleteByConversationId(UUID conversationId);
}
