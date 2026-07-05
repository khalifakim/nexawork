package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.requests.CreateConversationRequest;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.ConversationResponse;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;

import java.util.List;
import java.util.UUID;

/**
 * Conversations directes (§13.5). Unicité d'une conversation DIRECT entre deux
 * utilisateurs d'un workspace. Messages + accusé de lecture ({@code readAt} ✓✓).
 */
public interface ConversationService {

    List<ConversationResponse> listMine();

    /** Ouvre ou récupère la conversation directe avec un autre utilisateur. */
    ConversationResponse openWith(CreateConversationRequest request);

    MessagePageResponse listMessages(UUID conversationId, String cursor, int size);

    MessageResponse sendMessage(UUID conversationId, SendMessageRequest request);

    /** Marque un message reçu comme lu (readAt = now). 403 si l'appelant n'est pas destinataire. */
    MessageResponse markRead(UUID messageId);
}
