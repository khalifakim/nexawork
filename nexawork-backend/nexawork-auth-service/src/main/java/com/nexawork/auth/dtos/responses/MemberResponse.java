package com.nexawork.auth.dtos.responses;

import com.nexawork.auth.entities.enums.OrgRole;

import java.time.LocalDateTime;

public record MemberResponse(
    Long id,
    Long userId,
    String email,
    String displayName,
    String avatarUrl,
    OrgRole orgRole,
    LocalDateTime joinedAt
) {}
