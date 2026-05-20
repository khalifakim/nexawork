package com.nexawork.auth.dtos.responses;

public record OrganisationResponse(
    Long id,
    String name,
    String slug,
    String logoUrl
) {}
