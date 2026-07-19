package com.nexawork.meeting.configurations;

import com.nexawork.meeting.properties.MeetingProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Client HTTP synchrone vers le File Service (V5.1 §14.4 · M5).
 *
 * <p>Nécessaire pour l'<b>invité externe</b> : il n'a pas de compte, donc pas de
 * JWT NexaWork, et ne peut pas appeler le File Service lui-même (upload et
 * téléchargement exigent une identité). Le Meeting Service — qui, lui, sait
 * valider son token d'invitation — relaie les octets pour son compte.</p>
 */
@Configuration
@RequiredArgsConstructor
public class FileClientConfiguration {

    private final MeetingProperties properties;

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
