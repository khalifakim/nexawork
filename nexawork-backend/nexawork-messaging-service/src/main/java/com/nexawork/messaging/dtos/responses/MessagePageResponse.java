package com.nexawork.messaging.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Page de messages avec pagination par curseur (§13.5, §14.14). Les messages sont
 * triés du plus récent au plus ancien ; {@code nextCursor} (= sentAt du plus ancien
 * message de la page, ISO) permet de charger la page précédente (plus ancienne).
 */
@Data
@Builder
public class MessagePageResponse {

    private List<MessageResponse> messages;
    private String nextCursor;
    private boolean hasMore;
}
