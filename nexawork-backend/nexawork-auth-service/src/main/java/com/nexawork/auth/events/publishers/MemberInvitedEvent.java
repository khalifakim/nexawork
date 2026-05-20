package com.nexawork.auth.events.publishers;

public record MemberInvitedEvent(
    Long organisationId,
    String organisationName,
    String inviteeEmail,
    String inviterDisplayName,
    String invitationToken
) {}
