package com.nexawork.ged.dtos.responses;

import java.time.LocalDateTime;

public record GedAccessGrantResponse(
    Long   id,
    String targetType,
    Long   targetId,
    String granteeType,
    Long   granteeId,
    String accessLevel,
    Long   grantedBy,
    LocalDateTime createdAt
) {}
