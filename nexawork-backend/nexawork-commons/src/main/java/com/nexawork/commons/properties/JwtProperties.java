package com.nexawork.commons.properties;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Bloc YAML `nexawork.jwt` du config-repo (V5.1 §14.9) :
 * access token 15 min, refresh token 7 jours (rotation en base).
 */
@Data
@Validated
@FieldDefaults(level = AccessLevel.PRIVATE)
@ConfigurationProperties(prefix = "nexawork.jwt")
public class JwtProperties {

    String base64Secret;

    long tokenValidityInSeconds = 900;

    long refreshTokenValidityInDays = 7;
}
