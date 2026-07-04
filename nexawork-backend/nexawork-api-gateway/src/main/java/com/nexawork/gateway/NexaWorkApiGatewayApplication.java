package com.nexawork.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Point d'entrée unique de NexaWork (port 8080).
 *
 * <p>Spring Cloud Gateway (WebFlux, réactif) : route vers les microservices
 * downstream selon le préfixe de context-path {@code /nexawork-{service}-api-v1/**},
 * valide le JWT ({@link com.nexawork.gateway.security.JwtAuthenticationFilter})
 * et propage l'identité aux services via les headers {@code X-User-Id} /
 * {@code X-Org-Id} / {@code X-Org-Role} (V5.1 §14.10).</p>
 *
 * <p>Contrairement aux services métier, le gateway ne dépend PAS de
 * {@code nexawork-commons} : commons est bâti sur la pile servlet (Spring MVC +
 * Spring Security filter chain), incompatible avec la pile réactive du gateway.
 * La validation JWT est donc répliquée ici avec JJWT seul.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class NexaWorkApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexaWorkApiGatewayApplication.class, args);
    }
}
