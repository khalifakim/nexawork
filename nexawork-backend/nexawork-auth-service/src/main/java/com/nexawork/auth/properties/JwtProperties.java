package com.nexawork.auth.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

@Component
@RefreshScope
@ConfigurationProperties(prefix = "nexawork.jwt")
@Getter
@Setter
public class JwtProperties {

    private String base64Secret;
    private long tokenValidityInSeconds = 86400;
    private int refreshTokenValidityInDays = 7;
}
