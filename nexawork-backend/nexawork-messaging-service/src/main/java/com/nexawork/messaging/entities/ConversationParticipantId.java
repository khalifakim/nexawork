package com.nexawork.messaging.entities;

import java.io.Serializable;
import java.util.Objects;

public class ConversationParticipantId implements Serializable {

    private Long conversation;
    private Long userId;

    public ConversationParticipantId() {}

    public ConversationParticipantId(Long conversation, Long userId) {
        this.conversation = conversation;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ConversationParticipantId that)) return false;
        return Objects.equals(conversation, that.conversation) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(conversation, userId);
    }
}
