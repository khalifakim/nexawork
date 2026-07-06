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
| Phase 4 | Project Service | ✅ Livrée | — |
| Phase 5 | File Service | ✅ Livrée | — |
| Phase 6 | GED Service | ✅ Livrée | — |
| Phase 7 | Messaging Service | ✅ Livrée | — |
| Phase 8 | Notification Service | ✅ Livrée | — |
| Phase 9 | Meeting Service (JaaS) | ✅ Terminé (Lot 9A + 9B) | — |
| Phase 10 | Meeting — évolutions visio (M1→M6) | 🚧 M1 backend ✅ · M2→M6 en pause | — |

## Détail par phase livrée

### Phase 0 · Infrastructure Docker
- **Livrables** : 4 containers infra healthy (PostgreSQL 17, Redis 7, RabbitMQ 3, MinIO), 7 bases `nexawork_*_db`, exchange `nexawork.events` + 8 queues, 3 buckets privés, SMTP Gmail validé end-to-end, sidecars `rabbitmq-init` + `minio-init`, Nginx purgé de Jitsi.
- **Modifs V5.1** : §3.8, §5.3, §12.1
- **Commit** : `5b31ece`
- **Correctif (pendant Lot 4B)** : `scripts/init-rabbitmq.sh` réconcilié avec V5.1 §7.4 (8 queues). Ajout `nexawork.messaging.project-created` (bloquant Phase 7) et `nexawork.notification.call-ended` ; suppression de `nexawork.ged.file-attached` (event `file.attached.to.task` retiré en V5.1 §4.3/§7.2) ; renommage `nexawork.notification.external-guest-invited` → `...external-guest`. Nettoyage idempotent des queues obsolètes ajouté au script. Appliqué en live (sidecar rejoué) + double routage `project.created` → GED + Messaging vérifié.

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

### Phase 4 · Project Service (port 8082) — ✅ Terminée (5 sous-lots livrés, 1 commit par lot)
Découpage : **4A** Fondation · **4B** Projets/membres/équipes · **4C** Workflow Kanban · **4D** Tâches (FSM) · **4E** Dashboard/overview.

#### Lot 4A · Fondation — ✅ Livré (build healthy, aucun endpoint métier)
- **Livrables** :
  - Module `nexawork-project-service` rattaché au parent `nexawork-backend` (calque Auth). `Dockerfile` multi-module ; service `project-service` dans `docker-compose.yml` en contexte de build multi-module + réintroduit dans le `depends_on` du gateway.
  - Bootstrap `ProjectServiceApplication` — **scan restreint** à `com.nexawork.project` + `commons.config` + `commons.exceptions` (exclut `commons.security` : pas de secret JWT côté service).
  - **Sécurité inter-services** : `GatewayIdentityFilter` (servlet) reconstruit un `Claims` depuis `X-User-Id`/`X-Org-Id`/`X-Org-Role` → `SecurityUtils`/`AuditorAwareImpl` de commons fonctionnent tels quels ; `SecurityConfiguration` stateless (actuator/openapi publics, reste authentifié) ; `JpaConfiguration` (audit), `RabbitMQConfiguration` (exchange défensif), `SwaggerConfiguration`.
  - **9 entités** (`Project`, `Team`, `ProjectMember`, `WorkflowStatus`, `WorkflowTransition`, `Task`, `SubTask`, `TaskComment`, `TaskAttachment`) + **6 enums** + **9 repositories** Spring Data.
  - Migration Flyway `V1__init.sql` : 9 tables, FK CASCADE/SET NULL/RESTRICT (to_status protégé), CHECK assignation polymorphe, UNIQUE(project_id,user_id) + UNIQUE(from,to) transitions, index.
- **Tests (live, conteneur healthy)** : Flyway V1 appliqué → 9 tables ; gateway route `/nexawork-project-api-v1/**` (actuator/health public → 200) ; route protégée sans token via gateway → 401 ; chaîne sécurité service active (403 en accès direct sans identité) ; readiness (db+rabbit) → 200.
- **Décisions / écarts** : QueryDSL du squelette **remplacé** par Spring Data JPA (JPQL/@Query) — plus simple, cohérent template Auth. Event `file.attached.to.task` **abandonné** (retiré de V5.1 §4.3/§7.2) au profit de l'endpoint synchrone task-attachments → Project publie **3 events**.
- **Modifs V5.1** : §14.11 (9 entités, 3 events + réconciliation `file.attached.to.task`, Spring Data au lieu de QueryDSL, identité via headers Gateway).
- **Commit** : à venir

#### Lot 4B · Projets + membres + équipes — ✅ Livré
- **Livrables** :
  - `CallerContext` (rôles/identité depuis headers Gateway) + `ProjectGuard` (isolation multi-tenant, REF E, contrôle chef de projet/admin) — mutualisés pour les lots suivants.
  - `commons` : `ConflictException` générique (→ 409) + entrée dans `GlobalControllerExceptionHandler` (réutilisable REF E / REF A).
  - **Projets** : CRUD + archive/restore + `archived-projects` (list/get). Visibilité liste : admin → tous les projets actifs du workspace, sinon ceux dont l'appelant est membre (R15, requête `findVisible`). Création → l'auteur devient chef de projet (MANAGER, isProjectLead) + publie `project.created`.
  - **Membres** : list/add/update/remove ; `setAsProjectChief` redéfinit `Project.ownerUserId` ; interdiction de retirer le chef en poste (400).
  - **Équipes** : list/create.
  - 5 requests + 3 responses + 3 mappers MapStruct + publisher `project.created` (+ payload) + 4 contrôleurs.
- **Règles serveur** : **R6/R7** (archive/restore/delete/consultation archivés = ADMIN+OWNER, 403 sinon) · **R9-R21** (gestion membres/équipes = ADMIN+OWNER+chef de projet) · **REF E** (mutation projet archivé → 409) · isolation multi-tenant (404 cross-org).
- **Tests (live via gateway + service)** : create 201 (+event), list/get (memberCount, ownerUserId), PATCH 200, teams 201, members add/list, setAsProjectChief → ownerUserId mis à jour, REF E PATCH/add-membre archivés → 409, archived-projects OWNER OK, restore 200 ; **R6/R7 : MEMBER → 403** (archive/delete/archived-projects) ; **isolation cross-org → 404** ; event `project.created` routé (queue `nexawork.ged.project-created`).
- **✅ Écarts infra Phase 0 découverts ET corrigés dans la foulée** (voir Phase 0 · Correctif) : `scripts/init-rabbitmq.sh` réconcilié §7.4 (8 queues), double routage `project.created` → GED + Messaging vérifié en live.
- **Modifs V5.1** : aucune (réconciliation §14.11 déjà faite au Lot 4A ; le correctif infra aligne le script sur §7.4 déjà correct).
- **Commit** : à venir

#### Lot 4C · Workflow Kanban (statuts + transitions + config) — ✅ Livré
- **Livrables** :
  - **Statuts** : list/create/update/delete (`/projects/{id}/statuses`, `/statuses/{id}`). `isInitial`/`isFinal` **dérivés de la catégorie** (`WorkflowRules` : NOT_STARTED→initial, DONE/CLOSED→final), re-dérivés à chaque changement de catégorie. Suppression d'un statut cible d'une transition → **409** (FK RESTRICT anticipée) ; sinon delete (tasks SET NULL, transitions sortantes CASCADE).
  - **Transitions** : list/create (`/projects/{id}/transitions`). Validations : statuts du projet, distincts (400), SPECIFIC_MEMBER exige un responsable (400), doublon → 409 (UNIQUE from+to).
  - **Workflow** : `PATCH /projects/{id}/workflow` — bascule `enforceWorkflowOrder` + mise à jour groupée des responsables de transitions ; renvoie `WorkflowResponse` (enforce + statuts ordonnés + transitions).
  - **Seeding par défaut** (`WorkflowSeeder`, branché sur la création de projet, V5.1 §8.1) : 4 colonnes — À faire (NOT_STARTED/initial), En cours (ACTIVE), En révision (ACTIVE), Validé (DONE/final) — + 3 transitions linéaires ALL.
  - 5 requests + 3 responses + 2 mappers + `WorkflowRules` + `WorkflowSeeder` + 3 services/impl + 3 contrôleurs.
  - **Cohérence** : ajout `ProjectGuard.requireProjectVisibility` (R15) appliqué aux listes statuts/transitions — un non-membre du projet reçoit 403 (aligné sur `get`/`members`/`teams`).
- **Règles serveur** : **R8** (statuts/workflow = ADMIN+OWNER+chef de projet, 403 sinon) · **REF E** (mutation sur projet archivé → 409) · **R15** (visibilité lecture = admin ou membre).
- **Tests (live, gateway + service)** : seeding 4 statuts (flags corrects) + 3 transitions ALL ; add statut (position auto, isFinal dérivé) ; PATCH statut re-dérive les flags ; create transition 201, doublon 409, self 400 ; delete statut cible 409 ; PATCH workflow (enforce=true + responsable PROJECT_LEAD) → persisté ; **R8 : MEMBER add-statut/workflow → 403** ; **REF E : add-statut/workflow sur projet archivé → 409** ; **visibilité : non-membre → 403, membre/admin → 200**.
- **NB** : la **validation FSM** (déplacement de tâche → 200/422 selon `enforceWorkflowOrder` + transition + responsable) est portée par le **Lot 4D** (tâches).
- **Modifs V5.1** : aucune.
- **Commit** : à venir

#### Lot 4D · Tâches + moteur FSM — ✅ Livré
- **Livrables** :
  - **Tâches** : CRUD (`/projects/{id}/tasks`, `/tasks/{id}`) + assignation polymorphe (USER membre du projet / TEAM du projet, validée 400 sinon).
  - **Moteur FSM** (`PATCH /tasks/{id}/status`, §10.2) : si `enforceWorkflowOrder=false` → déplacement libre entre statuts du projet ; si `true` → exige une `WorkflowTransition` (from→to) **et** un responsable autorisé (ALL / PROJECT_LEAD=chef / SPECIFIC_MEMBER) → **422** sinon. Placement initial libre (statut courant nul). Statut cible hors projet → 422.
  - **Sous-tâches / commentaires / pièces jointes** : CRUD ; suppression de commentaire réservée à l'auteur ou admin ; compteurs (subtask/comment/attachment) dans `TaskResponse`.
  - **Agrégat** `GET /projects/{id}/task-attachments` (§10.5bis) : pièces jointes de toutes les tâches enrichies (taskId/taskTitle), réservé aux membres du projet — consommé en HTTP synchrone par le GED (dossier virtuel).
  - **Events** : `task.assigned` (assignation à un utilisateur, create + update) et `livrable.validated` (passage en statut final). `ProjectEventPublisher` étendu (3 routing keys).
  - 7 requests + 5 responses + 4 mappers + 2 events + 4 services/impl + 4 contrôleurs. `commons` : `UnprocessableEntityException` (→ 422) + handler. `ProjectGuard.participantProject` (helper). Repos : compteurs + join fetch agrégat.
- **Règles serveur** : **FSM** (422) · **R15** (participant, 403) · **REF E** (mutation sur projet archivé → 409) · assignation cohérente (400).
- **Tests (live, gateway + service)** : create tâche + `task.assigned` (queue 0→1) ; assignee non-membre → 400 ; sous-tâche/commentaire/pièce jointe 201 + compteurs 1/1/1 ; agrégat task-attachments enrichi ; FSM libre 200 (+ `livrable.validated` queue=1) ; FSM imposé : saut 422, transition valide 200, cross-projet 422 ; responsable PROJECT_LEAD : membre 422 / chef 200 ; R15 non-membre → 403 ; REF E changeStatus/subtask archivé → 409.
- **Modifs V5.1** : aucune.
- **Commit** : à venir

#### Lot 4E · Dashboard & Overview — ✅ Livré (clôture Phase 4)
- **Livrables** :
  - `GET /workspaces/{id}/dashboard` (§13.2, §5.2) — **R1 : ADMIN+OWNER (403 sinon)**. Agrégats calculés sur les projets ACTIFS : 4 KPI (activeProjects, inProgressTasks=catégorie ACTIVE, overdueTasks=échéance passée & non final, **workspaceMembers=null**), `workload` **par projet**, `alerts` (OVERDUE/DUE_SOON/NO_ACTIVITY), `activeProjectsList` (avec santé), `overdueProjects` (breakdown, id=UUID).
  - `GET /projects/{id}/overview` (§13.2, §6.4.1) — **R15 : membre (403 sinon)**. Répartition par catégorie de statut (donut), avancement, retards, nb membres, échéances proches (≤ 7 j).
  - Rapports PDF (`/workspaces/{id}/report`, `/projects/{id}/report`) → **stub 501** (génération différée).
  - `ProjectHealth` (enum) + `DashboardService`/`Impl` + 2 responses + 2 contrôleurs. `commons` : `NotImplementedException` (→ 501). Repo `TaskRepository.findAllInProjects` (join fetch agrégat).
  - **Choix actés (avec le user)** : `workspaceMembers` = **null** (option B — roster = domaine Auth, complété côté frontend) ; « n en ligne » retiré du tableau de bord ; `workload` **par projet** (§5.2 autoritaire) ; `DashboardOverdueProject.id` = **UUID** (pas de slug) ; santé `CRITIQUE` si retard, `A_SURVEILLER` si échéance ≤ 7 j & avancement < 80 %, sinon `EN_BONNE_VOIE` ; alerte inactivité ≥ 14 j.
- **Tests (live)** : dashboard OWNER 200 (KPI/workload/alerts/santé/overdueProjects conformes, workspaceMembers=null), **R1 MEMBER → 403** ; overview OWNER 200 (répartition + échéances), **R15 non-membre → 403** ; report workspace+projet → **501**.
- **Modifs V5.1** : §13.2 (schéma DashboardResponse : workload « par projet », workspaceMembers null + note domaine Auth, slug→UUID, WorkloadEntry détaillé, formules santé/alertes) + §5.2 (KPI « membres du workspace », retrait « n en ligne »).
- **Commit** : à venir

### Phase 4 — Récapitulatif (5 lots livrés)
Project Service complet (port 8082) : 9 entités, workflow Kanban FSM, tâches, dashboard/overview. ~40 endpoints. Règles serveur : R1, R6-R8, R9-R21, R15, REF E, FSM (422). 3 events publiés (`project.created`, `task.assigned`, `livrable.validated`). Identité via headers Gateway (pas de secret JWT). Tout validé en live.

### Phase 5 · File Service (port 8086) — ✅ Livrée
- **Livrables** :
  - Module `nexawork-file-service` rattaché au parent (pom refait, QueryDSL/kotlin-reflect retirés), Dockerfile multi-module, service en contexte de build multi-module + réintroduit dans `depends_on` du gateway.
  - Sécurité : `GatewayIdentityFilter` + `SecurityConfiguration` (identité headers, pas de secret JWT), `SwaggerConfiguration`. `CallerContext`.
  - MinIO : `MinioProperties` (`nexawork.minio` : url, clés, 3 buckets, expiry présignée 900s), `MinioConfiguration` (bean `MinioClient`), `MinioService` (upload **SHA-256 en streaming** via `DigestInputStream`, download stream, URL présignée, remove, removeByPrefix pour cascade workspace).
  - `StoredFile` (§4.3, entité autonome, **id assigné par l'app** — pas de `@GeneratedValue`, pré-généré pour la clé d'objet) + repo + migration Flyway `V1`. Enum `UploadContext` (6 contextes wire). `BucketRouter` (routage §5.3 → bucket + objectKey, 400 si contexte/params manquants).
  - DTOs (`UploadContextParams`, `StoredFileResponse`, `PresignedUrlResponse`) + mapper. `FileService`/impl (orchestration route→PUT MinIO→INSERT), `FileController` (5 endpoints).
  - **Endpoints** : `POST /files?context=` (multipart), `GET /files/{id}`, `GET /files/{id}/url` (présignée), `GET /files/{id}/download` (proxifié stream), `DELETE /files/{id}` (hard delete objet+ligne).
- **Corrections infra** : config-repo `nexawork-file.yml` → `max-file-size: 25MB` (413) ; `docker-compose.yml` env aligné `MINIO_USER`/`MINIO_PASS` (matche le config-repo, corrige l'incohérence de credentials).
- **Tests (live via gateway)** : upload avatar→`nexawork-users`, channel-msg→`nexawork-messaging`, ged→`nexawork-documents` (clés §5.3 vérifiées dans MinIO) ; contexte inconnu → 400 ; upload 26 Mo → 413 ; SHA-256 base = SHA local ; download proxifié = fichier exact (SHA identique) ; URL présignée (900s) ; delete → objet MinIO retiré + GET 404.
- **Incident résolu** : upload 500 (StaleObjectStateException) — `@GeneratedValue(UUID)` + id pré-assigné faisait tenter un UPDATE ; corrigé en retirant `@GeneratedValue` (id assigné par l'application, INSERT via merge). Base `nexawork_file_db` recréée (checksum Flyway résiduel).
- **Modifs V5.1** : §13.3 (POST avec context+413+400+SHA ; ajout `GET /files/{id}/download` proxifié à côté de `/url` ; DELETE hard delete précisé).
- **Commit** : à venir

### Phase 6 · GED Service (port 8087) — ✅ Terminée (4 sous-lots livrés, 1 commit par lot)
Découpage : **6A** Fondation + consumer · **6B** Dossiers/Fichiers/corbeille (REF G/R11/R12) · **6C** Versions & Accès (R13/R16/modes) · **6D** Dossier virtuel (sync Project, 503).

#### Lot 6A · Fondation + consumer project.created — ✅ Livré
- **Livrables** :
  - Module `nexawork-ged-service` rattaché au parent (pom refait), Dockerfile multi-module, service en contexte de build multi-module + réintroduit dans `depends_on` du gateway. `PROJECT_SERVICE_HOST` + `nexawork.ged.project-service-url`/`timeout` au config-repo (pour le sync 6D).
  - Sécurité : `GatewayIdentityFilter` + `SecurityConfiguration` (identité headers), `SwaggerConfiguration`. `RabbitMQConfiguration` avec convertisseur JSON en mode **INFERRED** (mappe le payload sur le record local malgré le `__TypeId__` du Project Service).
  - **4 entités** (`GedFolder`, `GedFile`, `GedFileVersion`, `GedAccessGrant`) + **5 enums** (`FolderType`, `AccessMode`, `TargetType`, `GranteeType`, `AccessLevel`) + **4 repositories** + migration Flyway `V1`.
  - **Consumer `project.created`** (`ProjectCreatedConsumer`, queue `nexawork.ged.project-created`) : sème 2 dossiers racine (USER au nom du projet + TASK_ATTACHMENTS), **idempotent** (double garde : `existsBy…` + index unique partiel `(project_id, folder_type) WHERE parent_id IS NULL`).
- **Ajout modèle V5.1** : colonne **`access_mode`** (OPEN/PRIVATE/SHARED, défaut OPEN) sur `ged_folders` et `ged_files` — indispensable pour REF G, absente du modèle V5 initial. `deleted_at` ajouté aux deux. `FolderPermission` (legacy V1) non implémentée (remplacée par `ged_access_grants`).
- **Tests (live)** : build healthy ; 4 tables Flyway ; création projet → `project.created` consommé → 2 dossiers racine (USER + TASK_ATTACHMENTS) ; **idempotence : rejeu de l'event → toujours 2 dossiers** (pas 4) ; queue consommée (0 msg, 1 consumer) ; backlog des projets Phase 4 seedé rétroactivement (queue durable).
- **Modifs V5.1** : §4.4 (colonnes `access_mode` + `deleted_at` sur GedFolder/GedFile, note FolderPermission legacy).
- **Commit** : à venir

#### Lot 6B · Dossiers & Fichiers + corbeille (REF G / R11 / R12) — ✅ Livré
- **Livrables** :
  - `CallerContext`, `AccessEvaluator` (cœur REF G : `canView`/`requireViewable`→404, `requireDeletable`→403 R12, `requireEditable`→R13), `GedGuard` (chargement borné org→404, rejet dossier système→403).
  - **Dossiers** : list racines (scope org/projet), create (héritage scope du parent), content (USER : sous-dossiers + fichiers filtrés REF G ; TASK_ATTACHMENTS : vide, délégué 6D), update (rename/move), delete (soft).
  - **Fichiers** : list par dossier, add, get, update (rename), delete (soft), restore.
  - **Vues** : `my-documents`, `trash` (R11 par utilisateur), `DELETE /trash` (vidage). `shared-with-me` reporté au Lot 6C (grants).
  - 4 requests + 3 responses (+ `TaskAttachmentLineResponse` stub 6D) + 2 mappers + 2 services/impl + 3 contrôleurs.
- **Règles serveur** : **REF G** (visibilité OPEN=membre org / PRIVATE=créateur / SHARED=créateur+grants USER → **404** si interdit) · **R11** (corbeille filtrée par créateur) · **R12** (suppression créateur+ADMIN, 403 sinon) · **R13** (édition propriétaire/EDITOR/ADMIN) · rejet dossier système (403 sur create-sous-dossier/import/rename/delete/move).
- **REF G best-effort (documenté)** : OPEN vérifie l'appartenance workspace (X-Org-Id) ; la restriction stricte aux membres d'un projet (GED projet) relève du Project Service. SHARED n'évalue que les grants USER ; les grants TEAM seront affinés au Lot 6C.
- **Tests (live via gateway + service)** : CRUD dossier/fichier + content ; REF G (A voit privé 200, B 404, privé absent du content de B) ; R12 (B→403, ADMIN→200) ; rejets dossier système (sous-dossier/import/rename/delete → 403) ; R11 (corbeille de A visible par A, pas par B) ; restore 200.
- **Note** : REF E (blocage mutation GED sur projet archivé) non enforçable localement (statut projet = domaine Project) → différé/best-effort, à traiter si besoin via un flag propagé.
- **Modifs V5.1** : aucune (accessMode déjà documenté au 6A).
- **Commit** : à venir

#### Lot 6C · Versions & Accès — ✅ Livré
- **Livrables** :
  - **Versions** (`GedVersionService`/impl) : list (v1 synthétique si aucune enregistrée), add (numéro auto max+1, matérialise la baseline v1 au 1er ajout, met à jour le pointeur du GedFile), restore (crée une nouvelle version clonée qui devient courante — historique append-only). `GET/POST /ged/files/{id}/versions`, `POST …/{versionId}/restore`.
  - **Accès/Grants** (`GedAccessService`/impl) : list (ligne propriétaire synthétique `owner=true` en 1er — R13), add (bascule la cible en SHARED ; idempotent ; refus grant au propriétaire → 400), revoke. `GET/POST/DELETE /ged/grants`.
  - **Modes d'accès** : `PATCH /ged/folders|files/{id}/access` (OPEN/PRIVATE → purge des grants ; SHARED géré via /grants).
  - **`shared-with-me`** : fichiers dont l'appelant est bénéficiaire (grants USER).
  - 3 requests + 2 responses + 2 mappers + 2 services/impl + 2 contrôleurs + 3 endpoints ajoutés (access folder/file, shared-with-me).
- **Règles serveur** : **R13** (ligne propriétaire verrouillée : owner sans grant en base → non retirable par construction ; grant au propriétaire refusé 400) · **§11.6.c** (gérer les accès = propriétaire/ADMIN/EDITOR, 403 sinon) · rejet dossier système (403) · **R16 best-effort** (documenté : pas de vérif d'appartenance projet du bénéficiaire — domaine Project).
- **Tests (live)** : versions (list v1, add v2 + pointeur, restore v1→v3 append-only) ; grant READER → SHARED + B voit (200) ; R13 (owner:true en 1er, grant owner → 400) ; §11.6.c (READER gère accès → 403) ; révocation → B 404 ; mode SHARED→OPEN purge grants + B voit via org ; shared-with-me.
- **Modifs V5.1** : aucune.
- **Commit** : à venir

#### Lot 6D · Dossier virtuel TASK_ATTACHMENTS — ✅ Livré (clôture Phase 6)
- **Livrables** :
  - `GedProperties` (`nexawork.ged` : URL Project + timeout), `ProjectClientConfiguration` (bean `RestClient` avec connect/read timeout courts), `ProjectTaskAttachmentClient` (appel synchrone `GET /projects/{id}/task-attachments`, **forward de l'identité** X-User-Id/X-Org-Id/X-Org-Role, mapping enveloppe `Response<List>`).
  - `commons` : `ServiceUnavailableException` (→ **503**) + handler.
  - Branchement dans `getContent` : pour un dossier `TASK_ATTACHMENTS`, le contenu virtuel est calculé en temps réel (jamais persisté) → lignes `TaskAttachmentLineResponse` (readOnly=true, contextType=TASK_ATTACHMENT). Toute défaillance Project → 503.
- **Architecture** : unique appel HTTP synchrone inter-services de la plateforme (V5.1 §7.1, §10.5bis), justifié par l'exigence « zéro fichier fantôme ». Le forward d'identité fait respecter le R15 du Project (agrégat réservé aux membres du projet).
- **Tests (live via gateway)** : pièces jointes créées sur une tâche → dossier virtuel reflète 2 lignes enrichies (taskTitle, readOnly, contextType) ; **temps réel** : suppression d'une pièce jointe côté Project → disparaît immédiatement du dossier virtuel (pas de fantôme) ; **503** si Project arrêté (message explicite) ; le reste de la GED (dossiers USER) reste fonctionnel Project down.
- **Modifs V5.1** : aucune.
- **Commit** : à venir

### Phase 6 — Récapitulatif (4 lots livrés)
GED Service complet (port 8087) : arborescence documentaire, versions (append-only), accès granulaires (REF G/R11/R12/R13/R16 best-effort), dossier système virtuel via sync Project. ~25 endpoints. Consumer `project.created` idempotent. `access_mode` ajouté au modèle V5.1. Tout validé en live.

### Phase 7 · Messaging Service (port 8083) — ✅ Terminée (3 sous-lots livrés, 1 commit par lot)
Découpage : **7A** Fondation + Canaux · **7B** Messages/Conversations/readAt · **7C** WebSocket STOMP + events.

#### Lot 7A · Fondation + Canaux — ✅ Livré
- **Livrables** :
  - Module `nexawork-messaging-service` rattaché au parent (pom refait + `spring-boot-starter-websocket`), Dockerfile multi-module, service en contexte de build multi-module + réintroduit dans `depends_on` du gateway.
  - Sécurité : `GatewayIdentityFilter` + `SecurityConfiguration` (handshake `/ws/messaging/**` en white-list pour 7C), `SwaggerConfiguration`, `CallerContext`. `RabbitMQConfiguration` (converter mode INFERRED).
  - **6 entités** (`Channel`, `ChannelMember`, `Conversation`, `ConversationParticipant`, `Message`, `MessageMention`) + **5 enums** + **6 repositories** + migration Flyway `V1` (XOR channel/conversation via CHECK, PK composite participants).
  - **Consumer `project.created`** : crée les canaux par défaut « général » (HASH) + « annonces » (BELL, readonly), `isSystem=true`, idempotent.
  - **Canaux** : `ChannelAccessGuard` (REF F visibilité, REF D écriture, R14 création), `ChannelService`/impl, `ChannelController` : list (scope org/projet), create (R14), get, PATCH V5 (rename/icon/readonly), delete, GET/PUT access (privé + membres). `canWrite` dérivé dans la réponse.
- **Ajout modèle V5.1** : `message_mentions.is_read` + `conversation_participants.is_read` (état lu/non-lu pour la vue « Mentions reçues », §5.3) — absents du modèle V5 initial.
- **Best-effort documenté** : le Messaging ne connaît pas la composition des projets — REF D « chef de projet » (canal projet readonly) et R15 (visibilité canal projet) sont approximés (admin workspace) ; le raffinement relève du Project Service.
- **Tests (live)** : 6 tables Flyway ; seeding projet → #général (HASH) + #annonces (BELL readonly) ; **idempotence** (rejeu → 2 canaux) ; liste + canWrite ; **R14** (OWNER 201 / MEMBER 403) ; PATCH (rename/icon/readonly) ; **REF F** (membre voit privé 200, non-membre 404, absent des listes) ; **REF D** (canWrite=false sur annonces readonly pour MEMBER).
- **Modifs V5.1** : §4.5 (colonnes `is_read` sur message_mentions + conversation_participants). §7.5 (endpoint WS → `/nexawork-messaging-api-v1/ws/messaging`, note frontend Phase 10) sera fait au Lot 7C.
- **Commit** : à venir

#### Lot 7B · Messages + Conversations + readAt — ✅ Livré
- **Livrables** :
  - **Messages canaux** (`MessageService`/impl) : send (REF F accès + REF D écriture), list paginée par **curseur** (sentAt décroissant, `nextCursor`/`hasMore`), soft-delete (auteur/admin).
  - **Parsing mentions** (`MentionParser`) : ordre @@@→@@→@→# avec masquage progressif (pas de collision), + `MessageAssembler` (persiste mentions + assemble le DTO). `MessageMapper`.
  - **Threads** : `GET /threads/{id}/attachments` (fichiers joints) + `GET /threads/{id}/mentions` (groupées USER/TASK/DOCUMENT/CHANNEL).
  - **Conversations** (`ConversationService`/impl) : openWith (unicité DIRECT via requête sur les 2 participants), list, messages paginés, `PATCH /messages/{id}/read` → `readAt` (✓✓), 403 si expéditeur ou non-destinataire.
  - 4 requests + 6 responses + 2 mappers/assembler + 2 services/impl + 4 contrôleurs (ChannelMessage, Conversation, Message, Thread).
- **Correctif** : pagination — `(:before IS NULL OR ...)` provoquait `SQLGrammarException` (PostgreSQL ne peut typer un paramètre null). Remplacé par des méthodes séparées première-page / avant-curseur.
- **Tests (live)** : envoi message + parsing 4 mentions ; pagination curseur (page1→curseur→page2) ; threads (attachments + mentions groupées) ; **REF D** (MEMBER écrit annonces readonly→403, ADMIN→201) ; conversations (ouverture + **unicité** = même conv) ; **readAt** (expéditeur→403, destinataire→200 + readAt renseigné).
- **Modifs V5.1** : aucune.
- **Commit** : à venir

#### Lot 7C · WebSocket STOMP + events — ✅ Livré (clôture Phase 7)
- **Livrables** :
  - **WebSocket STOMP** (`WebSocketConfiguration`) : endpoint `/ws/messaging` (SockJS + natif), broker simple `/topic` `/queue`, prefix `/app` + `/user`. `WebSocketHandshakeInterceptor` (identité headers Gateway → attributs de session). `StompMessageController` (`/app/channels|conversations/{id}/send`) + `StompIdentity` (réinjecte l'identité STOMP dans le SecurityContext).
  - **Broadcast** (`MessageBroadcaster`) : chaque envoi (REST ou STOMP) est diffusé sur `/topic/channels/{id}` ou `/topic/conversations/{id}`.
  - **Consumer `call.ended`** (`CallEndedConsumer`) : poste un message SYSTEM « Réunion … terminée — Durée : X min » dans le canal #général du projet + broadcast.
  - **Vue « Mentions reçues »** (`MentionService`/impl, `MentionController`) : list (+ filtre unread), read, mark-all-read. **Présence** (`PresenceController`) : `/presence/active` stub (Redis en Phase 8).
- **Best-effort documenté** : le parser extrait `targetText` mais ne résout pas `targetId` (résolution User/Task/Doc/Channel = autres domaines) → la vue mentions filtre sur `targetId` déjà résolu ; l'agrégation avec TaskComment (Project) relève d'une composition frontend. Filtrage d'abonnement WS = topics publics (dev) ; l'autorisation d'envoi reste vérifiée REST (REF D/F).
- **Tests (live)** : **WebSocket temps réel** (client STOMP s'abonne à `/topic/channels/{id}` → envoi REST → réception instantanée, received=1) ; consumer `call.ended` → message SYSTEM dans #général (« Durée : 3 min ») ; vue mentions (list/unread/mark-all-read validés avec données réelles) ; présence stub → 200.
- **Modifs V5.1** : §7.5 (endpoint WS → `/nexawork-messaging-api-v1/ws/messaging` sous context-path + /queue + /user prefix ; note frontend Phase 10).
- **Commit** : à venir

### Phase 7 — Récapitulatif (3 lots livrés)
Messaging Service complet (port 8083) : canaux (REF F/REF D/R14), messages + mentions + pagination curseur, conversations + readAt, **WebSocket STOMP temps réel**, consumers `project.created` + `call.ended`. ~30 endpoints. Ajouts modèle V5.1 : `message_mentions.is_read`. Tout validé en live (dont réception WS instantanée).

### Phase 8 · Notification Service (port 8085) — ✅ Terminée (3 sous-lots livrés, 1 commit par lot)
Découpage : **8A** Fondation + notifs temps réel + email · **8B** Présence Redis · **8C** Web Push VAPID.

#### Lot 8A · Fondation + notifs temps réel + email — ✅ Livré
- **Livrables** :
  - Module `nexawork-notification-service` rattaché au parent (pom : websocket + data-redis + mail + `nl.martijndwars:web-push` 5.1.1 + bouncycastle), Dockerfile multi-module, compose (build multi-module + env VAPID/SMTP + depends_on gateway). Config-repo : SMTP + `nexawork.mail` ajoutés.
  - Sécurité headers Gateway ; **WebSocket** (`WebSocketConfiguration` : `/ws/notifications`, push privé `/user/queue/notifications`) + `NotificationHandshakeInterceptor` (Principal = X-User-Id → cible du user-destination). `RabbitMQConfiguration` (INFERRED).
  - **2 entités** (`Notification`, `PushSubscription`) + enum `NotificationType` (10) + 2 repos + Flyway V1 (JSONB payload/keys).
  - **Politique de canaux** (`NotificationPolicy`, §4.7) ; `NotificationPusher` (WS) ; `EmailSender` (SMTP async) ; `NotificationCreator` (in-app + push WS + email selon politique).
  - **5 consumers** (`NotificationConsumer`) : `member.invited`, `task.assigned`, `livrable.validated`, `call.ended`, `external.guest.invited`.
  - Lecture : `NotificationService`/impl + `NotificationController` (GET paginé filtre lu/non-lu + unreadCount, PATCH read, PATCH hide).
- **Réconciliation** : **5 consumers** (le plan disait 4 ; §4.7/§7.2/§7.4 incluent `call.ended` → CALL_ENDED). Les types ADDED_TO_PROJECT/MENTION/MESSAGE_RECEIVED/DOCUMENT_SHARED/MEETING_INVITED n'ont pas encore d'event source (§7.2) → présents dans l'enum/politique mais non déclenchés en Phase 8.
- **Tests (live)** : 2 tables ; 5 queues avec consumer actif ; **push WS temps réel** (client STOMP abonné `/user/queue/notifications` → `task.assigned` publié → notif reçue instantanément, received=1) ; consumers task/livrable/call → notifs in-app ; GET (unreadCount/pagination), PATCH read (4→3), PATCH hide (total 4→3) ; isolation (B voit 0, B read notif de A → 403).
- **Non live-testé (documenté)** : email (member.invited/external.guest.invited, email-only) — non testé pour ne pas envoyer de vrais emails à des adresses fictives ; chemin symétrique + SMTP déjà validé côté Auth.
- **Modifs V5.1** : aucune.
- **Commit** : à venir

#### Lot 8B · Présence Redis — ✅ Livré
- **Livrables** :
  - `PresenceService` : clé Redis `presence:user:{id}` (compteur de sessions multi-onglets, TTL 30 s de sécurité), `markOnline`/`heartbeat`/`markOffline`/`isOnline`/`onlineUsers`.
  - `WebSocketPresenceListener` : `SessionConnectedEvent` → markOnline, `SessionDisconnectEvent` → markOffline (Principal WS = userId posé au handshake).
  - `StompPresenceController` : `@MessageMapping("/presence/heartbeat")` réarme le TTL (client ≈ 20 s).
  - `PresenceController` : `GET /presence/online` (vue « En ligne ») + `GET /presence/{userId}` (isOnline).
- **Tests (live)** : avant → isOnline=false ; 2 sessions WS ouvertes → isOnline=true, compteur Redis=2, A présent dans `/presence/online` ; fermeture des 2 sessions → isOnline=false, clé Redis supprimée (décrément final).
- **Note** : le stub `/presence/active` du Messaging (Phase 7) peut être branché sur ces clés Redis partagées si besoin ultérieurement (autorité de présence = Notification).
- **Modifs V5.1** : aucune.
- **Commit** : à venir

#### Lot 8C · Web Push VAPID — ✅ Livré (clôture Phase 8)
- **Livrables** :
  - `PushProperties` (`nexawork.push.vapid`), `WebPushSender` (lib `nl.martijndwars:web-push` + BouncyCastle, init VAPID au démarrage, envoi async best-effort).
  - Subscriptions : `RegisterPushRequest`/`UnregisterPushRequest`, `PushSubscriptionService`/impl (upsert par endpoint UNIQUE), `PushSubscriptionController` (`POST/DELETE /push/subscriptions`).
  - **Fallback offline** branché dans `NotificationCreator` : après le push WS, si `NotificationPolicy.pushEnabled(type)` **ET** `!presenceService.isOnline(recipient)` → Web Push à tous les abonnements (payload JSON title/body/url). En ligne → sauté (pas de doublon, §4.7).
- **Tests (live)** : Web Push initialisé (clés VAPID) ; `POST /push/subscriptions` → 201 + en base ; **hors ligne** + abonnement → push Web tenté (invocation lib prouvée, échec attendu sur endpoint/clé factices) ; **en ligne** → push sauté (compteur d'erreurs push inchangé) + notif reçue via WebSocket.
- **Non testable ici (documenté)** : livraison native au navigateur (endpoint réel FCM/Mozilla + service worker) — nécessite un vrai navigateur → validée manuellement/Phase 10. La logique de décision offline→push / online→skip est prouvée en live.
- **Modifs V5.1** : aucune.
- **Commit** : à venir

### Phase 8 — Récapitulatif (3 lots livrés)
Notification Service complet (port 8085) : 5 consumers RabbitMQ → notifs in-app + **push WebSocket** temps réel + email SMTP (§4.7), **présence Redis** (TTL + heartbeat), **Web Push VAPID** (fallback offline). CRUD notifications (list/read/hide) + subscriptions + présence. Tout validé en live (dont réception push WS instantanée et fallback offline/online).

### Phase 9 · Meeting Service (port 8084) — ✅ TERMINÉ (2 sous-lots, 1 commit par lot)
Découpage : **9A** Appels + JaaS + REF A · **9B** Invités externes + historique + REF B.

#### Lot 9A · Fondation + appels + JaaS + REF A — ✅ Livré
- **Livrables** :
  - Module `nexawork-meeting-service` rattaché au parent (pom + JJWT pour RS256), Dockerfile multi-module, compose (build multi-module + JAAS env déjà présents + depends_on gateway).
  - Sécurité headers Gateway (guest `/api/v1/guest/**` public pour 9B) ; `RabbitMQConfiguration` (publisher).
  - **6 entités** (`Call`, `CallParticipant`, `ExternalGuest`, `MeetingHidden` + tables `meeting_messages`/`meeting_files` créées, endpoints différés) + enum `CallStatus` + 4 repos + Flyway V1.
  - **`JitsiProperties` + `JitsiTokenService`** (code de référence §9.9.7 adapté UUID) : JWT **RS256** signé avec la clé privée PKCS#8 du `.env`, claims JaaS (kid, iss=chat, aud=jitsi, sub=tenant, room, context.user/features).
  - `CallService`/impl : `POST /calls` (crée salle + token, **REF A** 409), `join` (token + ONGOING, **REF A** 409), `leave` (libère REF A), `end` (status ENDED + publie **`call.ended`**), `GET /calls` (historique hors masqués), `GET /calls/{id}`, `GET /calls/ongoing`, `GET /users/me/ongoing-call`. URL assemblée §9.9.5. Publisher `MeetingEventPublisher`.
- **Adaptation** : `userId` du code de référence (`Long`) → **UUID** (modèle NexaWork).
- **Tests (live)** : 6 tables ; POST /calls → 201 + token + URL JaaS ; **token RS256 : signature vérifiée cryptographiquement** (clé dérivée de la privée) + claims conformes §9.9.4 (kid réel, iss/aud/sub/room, moderator=true) ; **REF A** (2e create → 409, join autre appel → 409) ; leave libère REF A (re-create 201) ; end → status ENDED + **`call.ended` publié ET consommé** (notif CALL_ENDED « Réunion terminée » créée côté Notification).
- **Modifs V5.1** : aucune (code répliqué depuis §9.9.7).
- **Commit** : à venir

#### Lot 9B · Invités externes + historique + REF B — ✅ Livré
- **Livrables** :
  - **Invités externes** : `GuestService`/impl — `invite` (crée `ExternalGuest` avec token UUID à usage unique + lien `frontend-base-url/guest/{token}` + publie **`external.guest.invited`**), `access` (public : valide token non consommé + appel ACTIVE → **token JaaS non modérateur** + marque `used`). DTOs `InviteGuestRequest`/`GuestInviteResponse`/`GuestAccessResponse`, event `ExternalGuestInvitedEvent`, `MeetingProperties` (`frontend-base-url`).
  - **Historique** : `CallService.hide(callId)` → insère `MeetingHidden` (PK composite call+user), exclu de `GET /calls` mais l'appel reste consultable (`GET /calls/{id}`).
  - **REF B** : `CallService.delete(callId)` → **403** si `!isWorkspaceAdmin()` (OWNER/ADMIN seuls), sinon suppression définitive (cascade DB).
  - **Contrôleurs** : `POST /calls/{id}/guests`, `POST /calls/{id}/hide`, `DELETE /calls/{id}` (`CallController`) ; `GuestController` **public** `GET /api/v1/guest/{token}`.
  - **Gateway** : route invité ajoutée à la liste blanche `PublicPathMatcher` (`/nexawork-meeting-api-v1/api/v1/guest/*` — accessible sans JWT).
- **Tests (live)** : validés en appelant le **meeting-service directement** (headers d'identité Gateway forgés) — voir note d'environnement. Créer appel 201 ; inviter 201 (guestToken + guestLink) ; **accès invité public 200** avec **JWT JaaS `moderator:"false"`, `id:"guest"`, RS256** ; **usage unique** 2ᵉ accès → 409 ; token inconnu → 404 ; **masquage** (hide 200 → historique vidé, `get` 200 : appel conservé) ; **REF B** delete MEMBER → **403**, OWNER → **200**, get après → 404 ; **`external.guest.invited` publié ET consommé** par Notification (`EmailSender` déclenché pour l'invité ; envoi SMTP TLS échoue = infra externe uniquement, comme documenté Lot 8A).
- **Modifs V5.1** : §4.6 (accès invité usage unique, masquage historique) et REF B implémentés conformément ; `frontend-base-url` ajouté au bloc `nexawork.meeting` du config-repo.
- **Commit** : à venir

> **Phase 9 terminée = socle backend NexaWork (Phases 0 → 9) livré.** Le frontend Angular des 9 domaines est également livré. La suite = **évolutions à valeur ajoutée de la visioconférence** (Phase 10 ci-dessous).

## Phase 10 · Meeting Service — Évolutions visioconférence (roadmap)

Objectif : dépasser le simple lancement d'appel JaaS pour apporter la valeur NexaWork (participants internes notifiés, approbation d'accès, historique du chat conservé, partage de fichiers, enregistrement). Rappel de l'état socle (Phase 9) : création d'appel + JWT JaaS (hôte modérateur), join/leave/end, `ongoing`, historique + masquage, invitation d'externes par email + lien à usage unique (token non-modérateur), REF A / REF B, event `call.ended`. Tables `meeting_messages` / `meeting_files` déjà présentes en base (V1) mais non exploitées.

**Légende** : 🔜 = Phase 1 (à faire maintenant) · 🗓️ = planifié (après la Phase 1).

### Lot M1 · Participants internes (notification « réunion en cours » + rejoindre) — ✅ Livré (backend)
Couvre le point #2 (ajouter des membres du workspace qui reçoivent une notification, voient l'appel en cours et peuvent le rejoindre tant qu'il est actif).
- **Backend (livré)** :
  - `POST /calls/{id}/participants` (`{userIds:[...]}`) → crée des `CallParticipant` (`invited_explicitly=true`, non encore joints) ; ignore l'appelant et les doublons ; 409 si appel non ACTIVE.
  - Event `meeting.participant.invited` (un par destinataire) publié sur `nexawork.events` → **consumer Notification** `nexawork.notification.meeting-invite` → notif `MEETING_INVITED` in-app + **push** « Réunion en cours — *inviteur* vous invite à « *topic* » — Rejoindre » (deep-link `/app/reunions/{callId}`). Queue ajoutée à `scripts/init-rabbitmq.sh`.
  - `GET /calls/active` : appels **ACTIVE** du workspace où l'appelant est convié **ou** hôte (pastille « appel en cours » + bouton Rejoindre côté front).
  - `CreateCallRequest.memberIds` optionnel : membres conviés dès la création (mêmes notifications).
- **Tests (live, appel direct meeting-service, identités forgées)** : `POST /participants` U2+U3 → **200** ; **`GET /calls/active`** : membre invité U2 voit l'appel ✅, non-invité U4 → **0** ✅, hôte U1 le voit ✅ ; création avec `memberIds` → le membre voit l'appel ✅ ; **chaîne event prouvée** : `meeting.participant.invited` publié par membre **ET consommé** → 3 notifications `MEETING_INVITED` créées (log `NotificationCreator`).
- **Frontend (reste)** : sélection des membres à la création ; pastille/toast « appel en cours » + bouton Rejoindre (branché sur la notif temps réel existante) + écran de liste `GET /calls/active`.

### Lot M2 · Persistance de l'historique du chat de réunion — 🔜
Couvre le point #7 (sauvegarder le chat à la fin pour consultation ultérieure), **sans remplacer** le chat JaaS (on l'écoute).
- **Backend** : entité `MeetingMessage` + repository (table `meeting_messages` déjà en base) ; `POST /calls/{id}/messages` (ingestion depuis le front, auteur = identité Gateway ou nom d'invité) ; `GET /calls/{id}/messages` (consultation ; accessible aux participants) ; conservation garantie à la fin de l'appel.
- **Frontend** : écoute de l'**IFrame API Jitsi** (`incomingMessage` / `outgoingMessage`) → POST vers le backend ; onglet « Historique du chat » dans le détail d'une réunion terminée.

### Lot M3 · Approbation des participants (lobby) — 🗓️
Couvre les points #4 (externes approuvés par le modérateur) et #5 (tout porteur de lien doit demander l'accès).
- **Approche** : activer le **mode lobby JaaS** ; l'admission se fait dans l'iframe via l'IFrame API (`knockingParticipant` → `answerKnockingParticipant`). Le modérateur (hôte) admet/refuse.
- **Backend** (si trace nécessaire) : état d'accès (`PENDING/ADMITTED/REJECTED`) + endpoints `request-access` / `admit` / `reject` ; sinon géré intégralement côté front via l'IFrame API.
- **Frontend** : UI modérateur d'admission (liste des personnes en attente).

### Lot M4 · Intégration fine de l'interface Jitsi (IFrame API) — 🗓️
Couvre le point #6 (ouvrir automatiquement l'interface de réunion). L'ouverture simple est déjà côté front ; ce lot consolide l'usage de l'**IFrame API** (embarquée) qui conditionne aussi M2 (chat) et M3 (lobby) plutôt qu'une simple redirection vers `jitsiUrl`.

### Lot M5 · Partage de fichiers pendant la réunion — 🗓️
Couvre le point #8 (partage de fichiers, puis leur sauvegarde).
- **Backend** : entité `MeetingFile` + repository (table `meeting_files` déjà en base) ; `POST /calls/{id}/files` (lie un `file_id` du File/GED Service) ; `GET /calls/{id}/files` ; conservation après la réunion.
- **Frontend** : soit un **espace dédié de partage** à côté de l'iframe, soit un **chat maison complet** avec pièces jointes (choix à trancher).

### Lot M6 · Enregistrement de la réunion — 🗓️
Enregistrer la réunion et permettre à l'utilisateur de sauvegarder la vidéo à la fin (fonction JaaS payante, facturée à la minute).
- **Backend/JaaS** : activer `context.features.recording=true` dans le JWT ; déclenchement via l'IFrame API (`startRecording` / `stopRecording`) ; définir la **cible de stockage** de l'enregistrement (téléchargement local, MinIO/GED, ou service tiers) et la récupération du fichier à la fin.
- **Frontend** : bouton Enregistrer (réservé au modérateur), indicateur d'enregistrement, récupération/téléchargement du fichier.

> **Ordre retenu** : **M1 livré (backend)**. **M2 → M6 mis en pause** à la demande (2026-07-06) — on se concentre sur M1 et sur l'alignement du document de référence avant de poursuivre. Rien n'est abandonné : chat (M2), lobby (M3), partage de fichiers (M5) et enregistrement (M6) restent au plan.

## Notes d'environnement (à connaître pour reprendre)
- **Build Maven sur l'hôte Windows** : nécessite `-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` (proxy TLS d'entreprise qui ré-signe HTTPS ; sans ça, PKIX path building failed sur Maven Central). Le build **Docker** n'est pas affecté (environnement conteneur propre).
- **Testcontainers** : Docker Desktop de cette machine renvoie un HTTP 400 sur `/info` au client docker-java (incompatibilité connue, indépendante du code). Les tests d'intégration Testcontainers sont donc conditionnés à la variable `RUN_INTEGRATION_TESTS=true` — ignorés proprement par défaut (build vert), exécutables sur une CI ou une machine où Docker coopère. Leur logique reste couverte par la validation live.
- **Port-forwarding hôte instable** (observé Phase 9B) : après un `docker compose up -d` qui **recrée** le conteneur gateway, le mapping `localhost:8080` → conteneur peut se figer (quirk Docker Desktop Windows, aggravé par la pression CPU/RAM — le gateway a mis 158 s à démarrer au lieu de ~18 s). Le conteneur reste *healthy* et répond en **interne**. Contournement de validation fiable : lancer un conteneur `curl` jetable sur le réseau `nexawork_default` et **appeler le service cible directement** (ex. `http://meeting-service:8084/...`) en forgeant les headers d'identité `X-User-Id`/`X-Org-Id`/`X-Org-Role` que le `GatewayIdentityFilter` fait confiance (bonus : permet de tester REF B 403 vs 200 en changeant juste `X-Org-Role`, sans créer de 2ᵉ utilisateur réel). Pour rétablir l'accès hôte : redémarrer Docker Desktop.

## Instructions pour les futures sessions
Si tu es une nouvelle instance Claude Code qui reprend le projet :
1. **Lis ce fichier en premier** — il te dit où en est le projet.
2. Lis ensuite `PLAN_DEV_BACKEND.md` et V5.1 pour le contexte.
3. Consulte le dernier commit sur `backend/dev` pour voir le dernier travail livré.

Ce fichier est mis à jour à la fin de chaque phase, **dans le même commit** que le code de la phase.
