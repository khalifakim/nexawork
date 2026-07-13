package com.nexawork.messaging.entities;

import com.nexawork.messaging.entities.enums.MessageType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Message d'un canal OU d'une conversation (V5.1 §4.5), appartenance XOR
 * (channel_id / conversation_id : exactement un non nul). {@code readAt} n'est
 * applicable qu'aux conversations directes (accusé de lecture ✓✓).
 */
@Entity
@Table(name = "messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Canal cible (null si conversation). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id")
    private Channel channel;

    /** Conversation cible (null si canal) — réf. logique (pas de FK objet). */
    @Column(name = "conversation_id")
    private UUID conversationId;

    @Column(name = "sender_user_id", nullable = false)
    private UUID senderUserId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** @deprecated remplacé par {@link #attachments} (V2). Conservé pour la lecture des anciens messages. */
    @Deprecated
    @Column(name = "attachment_url", length = 1024)
    private String attachmentUrl;

    /** @deprecated cf. {@link #attachmentUrl}. */
    @Deprecated
    @Column(name = "attachment_name")
    private String attachmentName;

    /** Pièces jointes du message (0..N) — V2. */
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MessageAttachment> attachments = new ArrayList<>();

    /** Ajoute une pièce jointe en maintenant le lien bidirectionnel. */
    public void addAttachment(MessageAttachment attachment) {
        attachment.setMessage(this);
        this.attachments.add(attachment);
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private MessageType messageType;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;

    @Column(name = "edited", nullable = false)
    private Boolean edited;

    /** Accusé de lecture par le destinataire (conversations directes uniquement). */
    @Column(name = "read_at")
    private Instant readAt;
}
