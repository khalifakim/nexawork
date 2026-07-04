package com.nexawork.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * NexaWork Project Service (port 8082) — cœur métier : projets, équipes,
 * workflow Kanban (FSM statuts + transitions), tâches (sous-tâches,
 * commentaires, pièces jointes), tableau de bord workspace (V5.1 §4.2, §13.2).
 *
 * <p>L'identité de l'appelant provient des headers injectés par l'API Gateway
 * ({@code X-User-Id} / {@code X-Org-Id} / {@code X-Org-Role}) — le service ne
 * re-valide pas le JWT et ne détient donc pas le secret (voir
 * {@link com.nexawork.project.security.GatewayIdentityFilter}).</p>
 *
 * <p>Le scan de composants se limite volontairement aux sous-packages commons
 * réutilisables ({@code config} : Jackson + CORS/RestTemplate ; {@code exceptions} :
 * handler global) : on exclut {@code commons.security} (TokenProvider,
 * WebSecurityManager) qui exigerait le secret JWT, inutile ici. Les utilitaires
 * commons (SecurityUtils, AuditorAwareImpl, Response, EntityMapper) sont
 * référencés directement, sans scan.</p>
 */
@SpringBootApplication(scanBasePackages = {
        "com.nexawork.project",
        "com.nexawork.commons.config",
        "com.nexawork.commons.exceptions"
})
public class ProjectServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProjectServiceApplication.class, args);
    }
}
