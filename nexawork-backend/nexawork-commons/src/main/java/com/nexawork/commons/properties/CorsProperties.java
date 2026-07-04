package com.nexawork.commons.properties;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Bloc YAML `nexawork-cors` commun du config-repo (voir application.yml).
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@ConfigurationProperties(prefix = "nexawork-cors")
public class CorsProperties {

    List<String> allowedOrigins = List.of("http://localhost:4200");

    String allowedMethods = "*";

    String allowedHeaders = "*";

    String exposedHeaders = "Authorization,Content-Disposition";

    boolean allowCredentials = true;

    long maxAge = 1800;
}
