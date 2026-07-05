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
| Phase 6 | GED Service | 🚧 En cours (Lot 6A ✅) | — |
| Phase 7 | Messaging Service | ⏳ À faire | — |
| Phase 8 | Notification Service | ⏳ À faire | — |
| Phase 9 | Meeting Service (JaaS) | ⏳ À faire | — |

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

### Phase 4 · Project Service (port 8082) — 🚧 EN COURS (découpée en 5 sous-lots, 1 commit par lot)
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

### Phase 6 · GED Service (port 8087) — 🚧 EN COURS (4 sous-lots, 1 commit par lot)
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

#### Lots 6B-6D : ⏳ à faire

### Phases 7-9 : ⏳ à faire

## Notes d'environnement (à connaître pour reprendre)
- **Build Maven sur l'hôte Windows** : nécessite `-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` (proxy TLS d'entreprise qui ré-signe HTTPS ; sans ça, PKIX path building failed sur Maven Central). Le build **Docker** n'est pas affecté (environnement conteneur propre).
- **Testcontainers** : Docker Desktop de cette machine renvoie un HTTP 400 sur `/info` au client docker-java (incompatibilité connue, indépendante du code). Les tests d'intégration Testcontainers sont donc conditionnés à la variable `RUN_INTEGRATION_TESTS=true` — ignorés proprement par défaut (build vert), exécutables sur une CI ou une machine où Docker coopère. Leur logique reste couverte par la validation live.

## Instructions pour les futures sessions
Si tu es une nouvelle instance Claude Code qui reprend le projet :
1. **Lis ce fichier en premier** — il te dit où en est le projet.
2. Lis ensuite `PLAN_DEV_BACKEND.md` et V5.1 pour le contexte.
3. Consulte le dernier commit sur `backend/dev` pour voir le dernier travail livré.

Ce fichier est mis à jour à la fin de chaque phase, **dans le même commit** que le code de la phase.
