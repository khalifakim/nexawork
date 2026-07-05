package com.nexawork.notification.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc {@code nexawork.push} du config-repo : Web Push VAPID (V5.1 §4.7, §E.3).
 * Clés ECDSA P-256 chargées depuis le {@code .env}.
 */
@Data
@ConfigurationProperties(prefix = "nexawork.push")
public class PushProperties {

    private boolean enabled = true;
    private Vapid vapid = new Vapid();

    @Data
    public static class Vapid {
        private String publicKey;
        private String privateKey;
        /** Contact obligatoire (RFC 8292), format mailto: ou https:. */
        private String subject;
    }
}
