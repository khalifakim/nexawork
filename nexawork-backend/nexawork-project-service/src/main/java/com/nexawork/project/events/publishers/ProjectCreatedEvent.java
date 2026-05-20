package com.nexawork.project.events.publishers;

public record ProjectCreatedEvent(
    Long projectId,
    String projectName,
    Long organisationId,
    Long ownerUserId
) {}
