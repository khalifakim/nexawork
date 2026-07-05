package com.nexawork.notification.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc {@code nexawork.mail} du config-repo : email sortant pour certains types
 * de notifications (table §4.7).
 */
@Data
@ConfigurationProperties(prefix = "nexawork.mail")
public class MailProperties {

    private String from;
    private boolean enabled = true;
    private String frontendBaseUrl = "http://localhost:4200";
}
