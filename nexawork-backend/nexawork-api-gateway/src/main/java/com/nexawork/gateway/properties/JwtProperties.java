package com.nexawork.gateway.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Bloc YAML {@code nexawork.jwt} du config-repo (partagé avec l'Auth Service).
 *
 * <p>Le gateway ne consomme que le secret : il valide la signature et lit les
 * claims, il n'émet jamais de token. Les autres propriétés du bloc
 * ({@code token-validity-in-seconds}, {@code refresh-token-validity-in-days})
 * sont ignorées ici.</p>
 */
@Data
@Validated
@ConfigurationProperties(prefix = "nexawork.jwt")
public class JwtProperties {

    /** Secret HMAC encodé en Base64, injecté via {@code JWT_SECRET}. */
    private String base64Secret;
}
