package com.nexawork.gateway.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "nexawork.jwt")
public class JwtProperties {
    private String base64Secret;
}
