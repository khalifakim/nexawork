package com.nexawork.meeting.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc {@code nexawork.jaas} du config-repo (V5.1 §9.9.7.b). Spring mappe
 * {@code api-key-id} → {@code apiKeyId} et {@code private-key} → {@code privateKey}
 * (relaxed binding). Le nom {@code JitsiProperties} est conservé (§9.9.7.b).
 */
@Data
@ConfigurationProperties(prefix = "nexawork.jaas")
public class JitsiProperties {

    /** vpaas-magic-cookie-... (JAAS_APP_ID / Tenant ID). */
    private String appId;

    /** vpaas-.../c66d9e (JAAS_API_KEY_ID / kid). */
    private String apiKeyId;

    /** Clé RSA PKCS#8 PEM en une ligne (JAAS_PRIVATE_KEY). */
    private String privateKey;

    /** https://8x8.vc (fixe). */
    private String url;
}
