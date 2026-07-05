package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /** Conversations DIRECT auxquelles un utilisateur participe, dans un workspace. */
    @Query("""
            SELECT c FROM Conversation c
            WHERE c.workspaceId = :workspaceId
              AND EXISTS (SELECT 1 FROM ConversationParticipant p
                          WHERE p.conversation = c AND p.userId = :userId)
            ORDER BY c.createdAt DESC
            """)
    List<Conversation> findMineInWorkspace(@Param("workspaceId") UUID workspaceId, @Param("userId") UUID userId);

    /** Conversation DIRECT existante liant exactement deux utilisateurs (unicité). */
    @Query("""
            SELECT c FROM Conversation c
            WHERE c.workspaceId = :workspaceId AND c.type = 'DIRECT'
              AND EXISTS (SELECT 1 FROM ConversationParticipant p1 WHERE p1.conversation = c AND p1.userId = :userA)
              AND EXISTS (SELECT 1 FROM ConversationParticipant p2 WHERE p2.conversation = c AND p2.userId = :userB)
            """)
    Optional<Conversation> findDirectBetween(@Param("workspaceId") UUID workspaceId,
                                             @Param("userA") UUID userA, @Param("userB") UUID userB);
}
