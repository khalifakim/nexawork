package com.nexawork.auth.dtos.responses;

public record UserResponse(
    Long id,
    String email,
    String displayName,
    String avatarUrl,
    Boolean isActive
) {}
