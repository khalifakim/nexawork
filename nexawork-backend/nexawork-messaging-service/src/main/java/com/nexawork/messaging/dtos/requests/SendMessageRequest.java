package com.nexawork.messaging.dtos.requests;

import lombok.Data;

import java.util.List;

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
}
