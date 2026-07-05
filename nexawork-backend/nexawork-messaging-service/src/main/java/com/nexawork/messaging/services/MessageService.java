package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.dtos.responses.ThreadAttachmentResponse;
import com.nexawork.messaging.dtos.responses.ThreadMentionsResponse;

import java.util.List;
import java.util.UUID;

/**
 * Messages de canaux (§13.5) + threads. Envoi soumis à REF D (readonly) et REF F
 * (accès). Pagination par curseur. Le broadcast WebSocket est branché au Lot 7C.
 */
public interface MessageService {

    /** Historique paginé d'un canal (curseur = sentAt du plus ancien message, ISO). */
    MessagePageResponse listChannelMessages(UUID channelId, String cursor, int size);

    MessageResponse sendChannelMessage(UUID channelId, SendMessageRequest request);

    void deleteMessage(UUID messageId);

    // ─── Threads (canal ou conversation) ───
    List<ThreadAttachmentResponse> threadAttachments(UUID threadId);

    ThreadMentionsResponse threadMentions(UUID threadId);
}
