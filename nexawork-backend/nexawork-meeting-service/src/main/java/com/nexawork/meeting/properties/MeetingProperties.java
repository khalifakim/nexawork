package com.nexawork.meeting.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc {@code nexawork.meeting} du config-repo.
 */
@Data
@ConfigurationProperties(prefix = "nexawork.meeting")
public class MeetingProperties {

    /** Base URL du frontend pour le lien d'accès invité (/guest/{token}). */
    private String frontendBaseUrl = "http://localhost:4200";
}
