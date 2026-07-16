package com.nexawork.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Mention d'un utilisateur dans un commentaire de tâche (§5.3/§4.7). Alimente la
 * notification « vous avez été mentionné » et l'onglet « Commentaires » de
 * « Mentions reçues ». Les cibles sont fournies résolues par le client (comme le
 * Messaging) : le domaine Project ne résout pas les identités.
 */
@Entity
@Table(name = "comment_mentions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentMention {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private TaskComment comment;

    @Column(name = "mentioned_user_id", nullable = false)
    private UUID mentionedUserId;

    @Column(name = "target_text")
    private String targetText;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead;
}
