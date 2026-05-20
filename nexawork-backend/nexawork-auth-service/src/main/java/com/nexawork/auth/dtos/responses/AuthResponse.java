package com.nexawork.auth.dtos.responses;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    Long userId,
    String email,
    String displayName,
    Long organisationId,
    String orgRole
) {
    public static AuthResponse of(String accessToken, String refreshToken,
                                   Long userId, String email, String displayName,
                                   Long organisationId, String orgRole) {
        return new AuthResponse(accessToken, refreshToken, "Bearer",
            userId, email, displayName, organisationId, orgRole);
    }
}
