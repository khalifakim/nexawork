# NexaWork — Statut d'implémentation

> Suivi vivant de l'avancement, mis à jour **à la fin de chaque étape**.
> - **Plan faisant autorité** : `docs-config/memoire/notes/PLAN_INTEGRATION_FRONTEND_BACKEND.md`
> - **Référentiel fonctionnel (source de vérité)** : `docs-config/memoire/conception/references/nexawork-reference-v5.md` (V5.1)
> - **Reprise de session** : `nexawork/notes/HANDOFF_PROMPT.md`
>
> **Règle** : toute divergence identifiée pendant l'implémentation → mettre à jour V5.1 immédiatement ;
> fin d'étape → mettre à jour ce fichier.

---

## 🎯 Où en est le projet

**Backend : ✅ 100 % livré** (baseline stable, branche `backend/dev`).
**Frontend : ✅ construit sur mocks.**
**Phase en cours : intégration Frontend ↔ Backend (mock → HTTP)** — voir le plan. **Rien encore démarré** côté intégration.

Progression globale intégration : **1 / 16 phases** (✅ I0 · prochaine : **I1 Auth & Workspace**).

> **Décision actée (2026-07-06)** : aucune fonctionnalité simulée ou stub dans le livrable final — recherche
> globale, rapports PDF et Meetings M2-M6 sont **tous à implémenter réellement** (exigences du mémoire).

---

## 1 · Baseline BACKEND — ✅ livré (Phases 0-10)

| Phase | Service / Livrable | Port | Statut |
| :-: | :- | :-: | :-: |
| 0 | Infrastructure Docker (PostgreSQL 17, Redis 7, RabbitMQ, MinIO) | — | ✅ |
| 1 | Config Server + Maven multi-module | 8888 | ✅ |
| 2 | Auth Service (template maître, JWT, workspaces, invitations, UserActionToken) | 8081 | ✅ |
| 3 | API Gateway (routage context-path, JWT, headers identité `X-User-Id/X-Org-Id/X-Org-Role`, CORS) | 8080 | ✅ |
| 4 | Project Service (projets, tâches, FSM Kanban, équipes, dashboard) | 8082 | ✅ |
| 5 | File Service (MinIO, SHA-256, 3 buckets) | 8086 | ✅ |
| 6 | GED Service (arborescence, versions, grants, dossier virtuel TASK_ATTACHMENTS) | 8087 | ✅ |
| 7 | Messaging Service (canaux, conversations, WebSocket STOMP, mentions, readAt) | 8083 | ✅ |
| 8 | Notification Service (5+1 consumers, push WS, email SMTP, présence Redis, Web Push VAPID) | 8085 | ✅ |
| 9 | Meeting Service (JaaS RS256, appels, invités externes, REF A/B) | 8084 | ✅ |
| 10 | Correctif Project — `task_key` lisible (PREFIX-NNN, migration V2) | — | ✅ |
| 10 | Meeting Lot M1 — participants internes (invitation + notif « réunion en cours ») | — | ✅ |

**Règles métier serveur** : REF A-I, R1-R21 implémentées (403/404/409/422). **Événements RabbitMQ** :
`member.invited`, `project.created`, `task.assigned`, `livrable.validated`, `call.ended`,
`external.guest.invited`, `meeting.participant.invited` (6 queues Notification + 1 GED + 2 Messaging).

> Le détail exhaustif de chaque phase backend (livrables, tests, modifs V5.1, commits) est dans
> l'historique Git de ce fichier et dans les messages de commit sur `backend/dev`.

---

## 2 · Suivi INTÉGRATION Frontend ↔ Backend

Référence : `PLAN_INTEGRATION_FRONTEND_BACKEND.md`. Légende : ✅ livré · 🚧 en cours · ⏳ à faire · ⛔ bloqué.

**Ordre d'exécution** (Meetings volontairement **en dernier**) :
I0 → I1 → I2 → I3 → I4 → I5 → I6 → I7 → I9 (recherche) → I10 (rapports PDF) → **bloc final Meetings** (I8 → M4 → M2 → M3 → M5 → M6).

| Ordre | Phase | Domaine | Statut | Notes |
| :-: | :-: | :- | :-: | :- |
| 1 | **I0** | Socle transverse (enveloppe, context-paths, UUID, auth flux, WS, JWT/refresh) | ✅ | Livré + validé live (2026-07-06). |
| 2 | **I1** | Auth & Workspace | ⏳ | Dépend I0. |
| 3 | **I2** | Projects + Tasks/Kanban | ⏳ | Cœur métier, gros recâblage d'écritures. |
| 4 | **I3** | Members | ⏳ | Annuaire + présence Redis. |
| 5 | **I4** | Channels + Conversations (+ STOMP) | ⏳ | Temps réel. |
| 6 | **I5** | GED / Documents | ⏳ | CRUD + versions + grants + File Service. |
| 7 | **I6** | Notifications (+ Web Push, STOMP) | ⏳ | Table `kind`↔`NotificationType`. |
| 8 | **I7** | Accueil / Dashboard | ⏳ | Agrège I2/I4 ; retirer `membersOnline`. |
| 9 | **I9** | Recherche globale (backend fédéré ILIKE + frontend) | ⏳ | **À implémenter** — endpoints `search` internes par service + agrégation Gateway. |
| 10 | **I10** | Rapports PDF (OpenPDF backend + téléchargement réel) | ⏳ | **À implémenter** — `/projects/{id}/report` + `/workspaces/{id}/report`. |

### Bloc final — Meetings (en dernier)
| Ordre | Phase | Intitulé | Backend | Frontend | Statut |
| :-: | :-: | :- | :-: | :-: | :-: |
| 11 | **I8** | Meetings — intégration socle (+ iframe JaaS) | ✅ (M1) | ⏳ | ⏳ |
| 12 | **M4** | Intégration fine IFrame API JaaS | n/a | ⏳ | ⏳ |
| 13 | **M2** | Persistance du chat de réunion | ⏳ | ⏳ | ⏳ |
| 14 | **M3** | Approbation des participants (lobby JaaS) | n/a | ⏳ | ⏳ |
| 15 | **M5** | Partage de fichiers en réunion | ⏳ | ⏳ | ⏳ |
| 16 | **M6** | Enregistrement de la réunion | ⏳ | ⏳ | ⏳ |

---

### Détail des phases livrées

#### I0 · Socle transverse — ✅ Livré (2026-07-06)
- **Créés** : `core/http/api.config.ts` (context-paths des 7 services + helper `api()`),
  `core/http/response.model.ts` (`ApiResponse<T>` + `unwrap()` + `PageInfo` + `extractApiError()`),
  `core/http/base-http.service.ts` (get$/post$/patch$/put$/delete$/getRaw$/blob$ — socle des `*HttpService`).
- **Modifiés** : `auth.models.ts` (UUID string partout ; `RegisterRequest{firstName,lastName,jobTitle}` ;
  `AuthResponse{accessToken,refreshToken,activeWorkspaceId,user}` imbriqué ; `RefreshRequest{refreshToken,workspaceId?}`) ;
  `auth.service.ts` (pattern abstrait + `AuthMockService` + `AuthHttpService` réel) ; `app.config.ts`
  (binding `AuthService` selon `useMock`) ; `auth.reducer.ts` (forme imbriquée + gère `refreshTokenSuccess`) ;
  `auth.effects.ts` (`res` direct + `extractApiError`) ; `jwt.interceptor.ts` (Bearer scoped `apiUrl`,
  routes publiques exclues) ; `error.interceptor.ts` (401 → refresh unique + replay, sinon logout ; toast
  4xx/5xx avec message backend) ; `session.service.ts` (adapté au mock) ; `environment.ts` (WS via gateway :8080).
- **Tests live** (contrat exact du frontend via gateway) : register → `{status:"CREATED", payload.user{...}}` ✅ ;
  login → tokens + `user.displayName` imbriqué ✅ ; `GET /users/me` Bearer → 200, sans → 401 ✅ ;
  workspace + `refresh(workspaceId)` → `activeWorkspaceId` + claims JWT `organisationId`/`orgRole` ✅ ;
  `ng build` vert ✅. `useMock` reste `true` (bascule par domaine à partir de I1).
- **V5.1** : note §7.5 (WS URLs frontend) marquée résolue.

## 3 · Décisions/gaps à acter (voir plan §5)
- **Recherche** : implémenter `/search` fédéré **ou** garder le mock (I9 bloquée sinon).
- **`myTasks()`** : dériver frontend **ou** ajouter endpoint Project `/users/me/tasks`.
- **`progress/docs/folders`** projet : dériver **ou** enrichir `ProjectResponse`.
- **`membersOnline`** : champ frontend d'une KPI retirée → nettoyer.

---

## 4 · Notes d'environnement (à connaître pour builder/tester)

- **Build Maven hôte Windows** : `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` + `JAVA_HOME=C:\Program Files\Java\jdk-21` (le mvn par défaut tourne en JDK 17). PowerShell découpe les args sur les points → passer par `MAVEN_OPTS`. **Le build Docker n'est pas affecté** (chemin canonique : `docker compose build <service>`).
- **Édition de `.sh`** : Edit/Write réécrit en **CRLF** sur ce poste → casse les scripts en conteneur Linux (`$'\r'`). Repasser en LF (`tr -d '\r'`) après édition. Les `.md` de `notes/` sont en CRLF (sans impact).
- **Validation live fiable** : le port hôte `localhost:8080` peut se figer après un recreate de conteneur (quirk Docker Desktop Windows, aggravé par la charge). Contournement : `docker run --rm --network nexawork_default curlimages/curl:latest -s http://<service>:<port>/...` en forgeant les headers `X-User-Id`/`X-Org-Id`/`X-Org-Role` (le `GatewayIdentityFilter` leur fait confiance ; permet aussi de tester REF B 403/200 en changeant `X-Org-Role`).
- **PostgreSQL** : user/db `postgres` (conteneur `nexawork-postgres`), 7 bases `nexawork_*_db`. Flyway checksum mismatch (résidus) → `DROP DATABASE ... WITH (FORCE); CREATE DATABASE` puis redémarrer le service.
- **Testcontainers** : Docker Desktop renvoie 400 sur `/info` → tests d'intégration conditionnés `RUN_INTEGRATION_TESTS=true` (ignorés par défaut, build vert).

---

## 5 · Git
- Repo code : `nexawork` — branche **`backend/dev`** (→ merge `main`). Remote `github.com/khalifakim/nexawork.git`.
- Repo docs : `docs-config` — branche **`main`**.
- **L'assistant ne commite jamais** : il propose les blocs (Bloc A = `nexawork`, Bloc B = `docs-config`), l'utilisateur exécute. **Pas de trailer `Co-Authored-By`.**
