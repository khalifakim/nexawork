package com.nexawork.auth.dtos.responses;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Tokens de session (§13.1) : access 15 min + refresh 7 j (rotation).
 * `activeWorkspaceId` reflète le contexte porté par le JWT (nullable).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private UUID activeWorkspaceId;
    private UserProfileResponse user;
}
