package com.nexawork.messaging.repositories;

import com.nexawork.messaging.entities.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    List<Conversation> findByWorkspaceId(Long workspaceId);

    @Query("""
        SELECT c FROM Conversation c
        JOIN c.participants p1 ON p1.userId = :userId1
        JOIN c.participants p2 ON p2.userId = :userId2
        WHERE c.type = 'DIRECT'
        """)
    Optional<Conversation> findDirectConversation(
        @Param("userId1") Long userId1,
        @Param("userId2") Long userId2);

    @Query("""
        SELECT c FROM Conversation c
        JOIN c.participants p ON p.userId = :userId
        WHERE c.workspaceId = :workspaceId
        """)
    List<Conversation> findByWorkspaceIdAndParticipantUserId(
        @Param("workspaceId") Long workspaceId,
        @Param("userId") Long userId);
}
