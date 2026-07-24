package com.nexawork.messaging.dtos.requests;

import com.nexawork.messaging.entities.enums.MentionType;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Envoi d'un message dans un canal ou une conversation (§13.5). Les mentions sont
 * extraites du contenu à l'envoi (parsing @@@/@@/@/#).
 *
 * <p>Le message doit porter du texte <b>ou</b> au moins une pièce jointe (validé
 * en service). {@code attachments} (V2) porte 0..N fichiers déjà téléversés au
 * File Service ; {@code attachmentUrl}/{@code attachmentName} sont l'ancienne
 * forme mono-pièce, conservée pour compatibilité.</p>
 */
@Data
public class SendMessageRequest {

    private String content;

    /** Id du message cité (réponse ciblée). Nul = message ordinaire. */
    private UUID replyToMessageId;

    /**
     * Cibles des mentions saisies, résolues **par le client** au moment de la
     * saisie (il choisit dans un catalogue réel : membres, tâches, documents,
     * canaux). Le Messaging ne peut pas résoudre ces libellés lui-même — ils
     * appartiennent à d'autres domaines. Le contenu reste la source de vérité
     * sur ce qui est mentionné : ces entrées ne servent qu'à attacher un
     * {@code targetId} aux mentions effectivement présentes dans le texte.
     */
    private List<MentionInput> mentions;

    /** Pièces jointes du message (URL + nom fournis par le File Service en amont). */
    private List<AttachmentInput> attachments;

    /** @deprecated forme mono-pièce héritée — préférer {@link #attachments}. */
    @Deprecated
    private String attachmentUrl;

    /** @deprecated cf. {@link #attachmentUrl}. */
    @Deprecated
    private String attachmentName;

    @Data
    public static class AttachmentInput {
        private String url;
        private String name;
    }

    /** Une mention résolue : son type, le libellé tel qu'écrit, et la cible réelle. */
    @Data
    public static class MentionInput {
        private MentionType type;
        private UUID targetId;
        private String targetText;
    }
}
