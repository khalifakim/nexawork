package com.nexawork.file.dtos.responses;

import lombok.Builder;
import lombok.Data;

/**
 * URL présignée de téléchargement (V5.1 §13.3 — {@code GET /files/{id}/url}).
 */
@Data
@Builder
public class PresignedUrlResponse {

    private String url;
    private int expiresInSeconds;
}
