package com.nexawork.ged.configurations;

import com.nexawork.ged.properties.GedProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Client HTTP synchrone vers le File Service (Brique 4).
 *
 * <p>Nécessaire au relais des liens de partage externes : un visiteur sans compte
 * n'a pas de JWT NexaWork et ne peut donc pas appeler le File Service (upload et
 * téléchargement exigent une identité). Le GED Service — qui, lui, sait valider le
 * token du lien — relaie les octets pour son compte, en forgeant les en-têtes
 * d'identité sur le réseau interne (mécanisme identique au relais invité du
 * Meeting Service).</p>
 */
@Configuration
@RequiredArgsConstructor
public class FileClientConfiguration {

    private final GedProperties properties;

    @Bean
    public RestClient fileRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(properties.getFileCallTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(properties.getFileCallTimeoutMs()));
        return RestClient.builder()
                .baseUrl(properties.getFileServiceUrl())
                .requestFactory(factory)
                .build();
    }
}
