package com.nexawork.project.repositories;

import com.nexawork.project.entities.CommentMention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommentMentionRepository extends JpaRepository<CommentMention, UUID> {

    /**
     * Mentions reçues par l'utilisateur (onglet « Commentaires »). Jointures
     * chargées pour construire le DTO (tâche + projet). Une auto-mention (auteur =
     * destinataire) est exclue en amont (jamais persistée).
     */
    @Query("""
            SELECT cm FROM CommentMention cm
            JOIN FETCH cm.comment c
            JOIN FETCH c.task t
            JOIN FETCH t.project p
            WHERE cm.mentionedUserId = :userId
            ORDER BY c.createdAt DESC
            """)
    List<CommentMention> findReceived(@Param("userId") UUID userId);
}
