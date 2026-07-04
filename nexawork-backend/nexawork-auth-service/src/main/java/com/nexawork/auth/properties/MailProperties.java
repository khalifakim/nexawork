package com.nexawork.auth.properties;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc YAML `nexawork.mail` (nexawork-auth.yml) — expéditeur, activation et
 * base URL du frontend pour la construction des liens (invitation, reset,
 * vérification).
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@ConfigurationProperties(prefix = "nexawork.mail")
public class MailProperties {

    String from;

    boolean enabled = true;

    String frontendBaseUrl = "http://localhost:4200";
}
