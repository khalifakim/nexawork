# NexaWork Backend — Statut d'implémentation

> Plan de suivi vivant, mis à jour à la fin de chaque phase **dans le même commit**.
> Source de vérité du plan : `docs-config/memoire/notes/PLAN_DEV_BACKEND.md`
> Référentiel fonctionnel : `docs-config/memoire/conception/references/nexawork-reference-v5.md` (V5.1)

## Vue d'ensemble

| Phase | Service | Statut | Commit |
| :-: | :- | :- | :- |
| Phase 0 | Infrastructure Docker | ✅ Livrée | 5b31ece |
| Phase 1 | Config Server + purge legacy + multi-module Maven | ✅ Livrée | 09dc46c |
| Phase 2 | Auth Service (template maître) | ✅ Livrée | 58b18f7 |
| Phase 3 | API Gateway | ✅ Livrée | à venir |
| Phase 4 | Project Service | ⏳ À faire | — |
| Phase 5 | File Service | ⏳ À faire | — |
| Phase 6 | GED Service | ⏳ À faire | — |
| Phase 7 | Messaging Service | ⏳ À faire | — |
| Phase 8 | Notification Service | ⏳ À faire | — |
| Phase 9 | Meeting Service (JaaS) | ⏳ À faire | — |

## Détail par phase livrée

### Phase 0 · Infrastructure Docker
- **Livrables** : 4 containers infra healthy (PostgreSQL 17, Redis 7, RabbitMQ 3, MinIO), 7 bases `nexawork_*_db`, exchange `nexawork.events` + 7 queues, 3 buckets privés, SMTP Gmail validé end-to-end, sidecars `rabbitmq-init` + `minio-init`, Nginx purgé de Jitsi.
- **Modifs V5.1** : §3.8, §5.3, §12.1
- **Commit** : `5b31ece`

### Phase 1 · Config Server + purge legacy + Maven multi-module
- **Livrables** : purge du code legacy des 8 services (268 fichiers), parent POM `nexawork-backend` (Spring Boot 3.5.5, Java 21, Spring Cloud 2025.0.2, versions centralisées), module skeleton `nexawork-commons`, `nexawork-config-server` opérationnel (port 8888, profil native, `/nexawork-auth/default` sert la fusion `application.yml` + service). Dockerfiles adaptés au build multi-module.
- **Modifs V5.1** : aucune (commit purement code).
- **Commit** : `09dc46c`

### Phase 2 · Auth Service (template maître)
- **Livrables** :
  - `nexawork-commons` peuplé des patterns Smart-Mifin : `Auditable` + `AuditorAwareImpl`, `Response<T>`, `EntityMapper`, hiérarchie d'exceptions (7) + `GlobalControllerExceptionHandler`, `JwtProperties`/`CorsProperties`, `SecurityUtils`, `WebSecurityManager`, `SecurityRule` builder (adapté Spring Security 6 : `requestMatchers` + `WebExpressionAuthorizationManager`) + `NexaWorkPermission`, `TokenProvider` (JJWT 0.12.x, claims userId/email/organisationId/orgRole/displayName) + `JWTFilter` + `JWTConfigurer`, `ObjectMapperConfiguration`, `WebConfigurer`.
  - Auth Service : entités JPA UUID (`User`, `Organisation`, `OrganisationMember`, `Invitation`, `RefreshToken`, `UserActionToken`, `AuditTrailEntity`) + enums (`OrgRole`, `InvitationStatus`, `ActionTokenType`), 7 repositories, sécurité (`SecurityConfiguration` white-list, `NexaWorkPermissions`, 5 Rules, `DomainUserDetailsService`), 5 services + Impl (`Authentication`, `User`, `Workspace`, `WorkspaceMember`, `Invitation`), mailer Gmail (`EmailSender`/`SmtpEmailSender`), publisher RabbitMQ `member.invited`, audit AOP `@Journal`/`JournalAspect`, 4 mappers MapStruct, 16 requests + 7 responses, 5 contrôleurs (~22 endpoints §13.1), migration Flyway `V1__init.sql`.
  - Règles serveur : **REF C** (OWNER intangible), **REF H** (delete workspace OWNER-only + révocation sessions), **REF I** (pas de bascule à la création), **R18** (self/OWNER non modifiables → 400), **R20** (self-leave + révocation si workspace actif).
- **Tests** : `TokenProviderTest` 6/6 ✅ ; parcours d'intégration Testcontainers écrit (conditionné `RUN_INTEGRATION_TESTS=true` — cf. note environnement ci-dessous) ; **16/16 critères d'acceptation validés en live** (curl contre le conteneur healthy).
- **Modifs V5.1** : §4.1 (entité `UserActionToken`, `activeOrganisationId` sur RefreshToken, `email_verified`/`pending_email` sur User, note audit sur toutes les tables Auth), §5.1 (colonnes SQL correspondantes + tables `user_action_tokens` et `audit_trail`), §6.1 (enum `ActionTokenType`), §13.1 (précisions refresh+workspaceId, `GET /invitations/{token}` public, accept). Le token access est passé à 900s (15 min) dans le config-repo, conforme §14.9.
- **Commit** : `58b18f7`

### Phase 3 · API Gateway (port 8080)
- **Livrables** :
  - Module `nexawork-api-gateway` rattaché au parent `nexawork-backend` (Spring Boot 3.5.5 / Spring Cloud 2025.0.2). Starter **`spring-cloud-starter-gateway-server-webflux`** (renommage 2025.0.x ; ancien `spring-cloud-starter-gateway` déprécié) — préfixe de propriétés `spring.cloud.gateway.server.webflux.*`.
  - Code Java (`com.nexawork.gateway`) : `NexaWorkApiGatewayApplication`, `properties/JwtProperties` (`nexawork.jwt`), `security/jwt/JwtTokenValidator` (validation JJWT autonome, secret HMAC partagé), `security/PublicPathMatcher` (liste blanche `AntPathMatcher`), `security/JwtAuthenticationFilter` (`GlobalFilter` ordre −100).
  - Le gateway **ne dépend pas de `nexawork-commons`** (pile servlet incompatible avec WebFlux réactif) : la validation JWT y est répliquée avec JJWT seul, sur le même secret que l'Auth Service.
  - **Sécurité** : liste blanche (auth anonymes + `GET /invitations/{token}` + actuator/OpenAPI) ; toute autre route exige un Bearer valide (401 sinon) ; **anti-spoofing** — purge systématique des headers `X-User-Id`/`X-Org-Id`/`X-Org-Role` entrants avant réinjection depuis les claims du JWT validé.
  - **Routage direct** par context-path (`/nexawork-{service}-api-v1/**`), sans réécriture, + routes WebSocket `ws://` (`/ws/messaging/**`, `/ws/notifications/**`). CORS global sur `http://localhost:4200`.
  - Infra : module ajouté au parent POM ; `Dockerfile` multi-module (contexte `./nexawork-backend`, `mvn -pl nexawork-api-gateway -am`) ; service `api-gateway` dans `docker-compose.yml` avec contexte de build multi-module et `depends_on` réduit à config-server + auth-service (healthy) — les autres downstream réintroduits aux phases 4-9 ; `nexawork-gateway.yml` migré vers le préfixe 2025.0.x.
- **Tests** : **6/6 critères validés en live** (curl contre le conteneur healthy) — route publique register/login → 201/200 ; token valide sur `GET /workspaces` → 200 ; sans token → 401 ; token invalide → 401 ; anti-spoofing (X-User-Id forgé sans token) → 401 ; préflight CORS localhost:4200 → 200 + en-têtes `Access-Control-Allow-*`. Gateway healthy.
- **Modifs V5.1** : §13 (intro Partie XIII : routage direct par context-path + headers d'identité réels `X-User-Id`/`X-Org-Id`/`X-Org-Role` au lieu de `X-User-Role`/`X-Workspace-Id`), §14.10 (livrables détaillés : starter/préfixe 2025.0.x, secret HMAC partagé, anti-spoofing, liste blanche ; curl d'acceptation corrigé vers le chemin réel + critère CORS).
- **Commit** : à venir

### Phases 4-9 : ⏳ à faire

## Notes d'environnement (à connaître pour reprendre)
- **Build Maven sur l'hôte Windows** : nécessite `-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` (proxy TLS d'entreprise qui ré-signe HTTPS ; sans ça, PKIX path building failed sur Maven Central). Le build **Docker** n'est pas affecté (environnement conteneur propre).
- **Testcontainers** : Docker Desktop de cette machine renvoie un HTTP 400 sur `/info` au client docker-java (incompatibilité connue, indépendante du code). Les tests d'intégration Testcontainers sont donc conditionnés à la variable `RUN_INTEGRATION_TESTS=true` — ignorés proprement par défaut (build vert), exécutables sur une CI ou une machine où Docker coopère. Leur logique reste couverte par la validation live.

## Instructions pour les futures sessions
Si tu es une nouvelle instance Claude Code qui reprend le projet :
1. **Lis ce fichier en premier** — il te dit où en est le projet.
2. Lis ensuite `PLAN_DEV_BACKEND.md` et V5.1 pour le contexte.
3. Consulte le dernier commit sur `backend/dev` pour voir le dernier travail livré.

Ce fichier est mis à jour à la fin de chaque phase, **dans le même commit** que le code de la phase.
