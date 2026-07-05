package com.nexawork.ged.configurations;

import com.nexawork.ged.properties.GedProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Client HTTP synchrone vers le Project Service pour le dossier virtuel
 * TASK_ATTACHMENTS (V5.1 §10.5bis). Timeouts courts : au-delà, l'appel échoue et
 * le GED renvoie 503 plutôt qu'un contenu partiel.
 */
@Configuration
@RequiredArgsConstructor
public class ProjectClientConfiguration {

    private final GedProperties properties;

    @Bean
    public RestClient projectRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(properties.getProjectCallTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(properties.getProjectCallTimeoutMs()));
        return RestClient.builder()
                .baseUrl(properties.getProjectServiceUrl())
                .requestFactory(factory)
                .build();
    }
}
