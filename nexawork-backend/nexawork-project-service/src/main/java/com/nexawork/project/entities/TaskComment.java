package com.nexawork.project.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Commentaire d'une tâche (V5.1 §4.2). Le contenu peut porter des mentions
 * (parsées en aval). Composition : cascade avec la tâche parente.
 */
@Entity
@Table(name = "task_comments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "author_user_id", nullable = false)
    private UUID authorUserId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<CommentAttachment> attachments = new ArrayList<>();

    /** Ajoute une pièce jointe en maintenant le lien bidirectionnel. */
    public void addAttachment(CommentAttachment attachment) {
        attachment.setComment(this);
        this.attachments.add(attachment);
    }
}
