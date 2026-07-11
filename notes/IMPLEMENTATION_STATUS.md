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

**Backend : ✅ baseline livrée** (9 microservices, phases 0-10, branche `backend/dev`).
⚠️ **Nuance importante** : « backend livré » vaut pour la **baseline**, pas pour tout le plan. **Trois phases
restantes exigent du développement backend neuf** : **I9** (endpoints de recherche), **I10** (génération PDF),
**M2** (persistance du chat de réunion). Voir la colonne « Backend » ci-dessous.

**Frontend : ✅ construit sur mocks.**
**Phase en cours : intégration Frontend ↔ Backend (mock → HTTP)**, phase par phase — voir le plan.

Progression intégration : **14 / 14 phases du périmètre livrable** (✅ I0, I1, I2, I3, I4, I5, I6, I7, I9, I10, **I8, M4, M2, M3**). 🎉 **Intégration frontend↔backend code-complète.** Reste : la **session de test finale** (lancer la stack, corriger). M5/M6 = perspectives hors périmètre.
> 🔓 **Présence « en ligne » débloquée en I6** : elle est tenue par le **Notification Service** (`GET /presence/online` + heartbeat STOMP `/app/presence/heartbeat`), pas par le Messaging (dont `/presence/active` est un stub). `MembersService.online()` a été recâblé — le « En ligne » d'I3 fonctionne désormais.
> ⚠️ **Sprint sans test intermédiaire (2026-07-11)** : sur décision utilisateur (machine 8 Go), on développe toutes les phases d'affilée et on teste **tout à la fin**. `ng build` (dev+prod) vert après chaque phase ; le **temps réel STOMP (I4/I6)** et le **backend neuf (I9/I10/M2/M3)** ne seront validés qu'à la session finale.
*(14 = 16 phases initiales − M5/M6 repassées en perspective.)*

### 📌 État réel du code (vérifié 2026-07-09)
- **Services HTTP frontend existants : 2 seulement** — `AuthHttpService`, `WorkspaceHttpService`.
  Les **10 autres domaines** (projets, tâches, membres, canaux, conversations, GED, notifications, accueil,
  réunions, recherche) sont liés **en dur** à leurs `*MockService` dans `data.providers.ts` (aucun `*HttpService` écrit).
- **Client STOMP : non écrit** — `@stomp/stompjs` + `sockjs-client` sont installés, mais aucun service WebSocket.
- **Absents du backend** : endpoints `/search` (I9), génération PDF / OpenPDF (I10), entités
  `MeetingMessage`/`MeetingFile` (M2/M5 — les tables existent, vides).

### ✅ I1 clôturée (2026-07-10)
Le lot de corrections Auth a été **buildé, testé en navigateur et validé**. V5.1 est aligné (§3.2, §3.3, §3.4,
§3.5, §13.1, §14.10, §15.1, §15.2, enum `ActionTokenType`). **Prochaine phase : I2.**

> **Décision actée (2026-07-06)** : aucune fonctionnalité simulée ou stub dans le livrable final — recherche
> globale, rapports PDF et Meetings sont à implémenter réellement (exigences du mémoire).
>
> **Révision (2026-07-08)** : dans le bloc Meetings, seule la **persistance du chat de réunion (M2)** reste
> dans le périmètre livré. Le **partage de fichiers en réunion (M5)** et l'**enregistrement (M6)** sont
> **reportés en perspective** (l'enregistrement suppose un tier JaaS payant ou un Jibri auto-hébergé). V5.1 §4.6/§14.4 alignés.

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

Référence : `PLAN_INTEGRATION_FRONTEND_BACKEND.md`. Légende : ✅ livré · 🚧 en cours · ⏳ à faire · ⛔ bloqué · 🔮 perspective (reporté).

**Ordre d'exécution** (Meetings volontairement **en dernier**) :
I0 → I1 → I2 → I3 → I4 → I5 → I6 → I7 → I9 (recherche) → I10 (rapports PDF) → **bloc final Meetings** (I8 → M4 → M2 → M3).
*(M5/M6 sortis du périmètre → perspective.)*

Colonne **Backend** : ✅ = déjà livré (baseline) · 🔴 = **développement backend neuf requis**.

| Ordre | Phase | Domaine | Backend | Frontend | Statut | Notes |
| :-: | :-: | :- | :-: | :-: | :-: | :- |
| 1 | **I0** | Socle transverse (enveloppe, context-paths, UUID, JWT/refresh) | ✅ | ✅ | ✅ | Livré + validé live (2026-07-06). |
| 2 | **I1** | Auth & Workspace | ✅ | ✅ | ✅ | I1a-d + **lot de corrections validé live (2026-07-10)** — voir §1bis. |
| 3 | **I2** | Projects + Tasks/Kanban | ✅ (+`comment_attachments`) | ✅ | ✅ | **Livrée (I2a+b+c)** : projets, board FSM, tâches, fiche complète, commentaires+PJ, **statuts/workflow persistés, vue d'ensemble, gantt réels**. Voir « Détail I2a/b/c ». |
| 4 | **I3** | Members | ✅ | ✅ | ✅ | **Livrée** : `MembersHttpService` (annuaire Auth réel). ⚠️ présence « en ligne » vide tant que l'infra WebSocket (I4/I6) n'alimente pas Redis — `/presence/active` est un stub côté backend. |
| 5 | **I4** | Channels + Conversations | ✅ | ✅ | 🚧 | **Code livré** (2 `*HttpService` + client STOMP `core/ws/`). ⚠️ **temps réel non testable avant la session finale**. Routing par slug conservé (résolution slug↔UUID interne). PJ de message différées (dépendance circulaire `messageId`). |
| 6 | **I5** | GED / Documents | ✅ | ✅ | ✅ | **Livrée** (a+b+c) : arborescence, écritures (import File Service), versions, **accès/grants réels par UUID** (R16 : bénéficiaires = membres+équipes du projet), bibliothèque (mes-docs/partagés/corbeille), **photo de profil** (File Service `avatar`). `ged` → `false`. Builds dev+prod verts. |
| 7 | **I6** | Notifications | ✅ | ✅ | ✅ | **Livrée** : `NotificationsHttpService` (liste, lu, masquer), **STOMP** `/user/queue/notifications` (temps réel), **Web Push** (`public/sw-push.js` + `WebPushService` + clé VAPID), **présence réelle** (heartbeat STOMP → Redis). Client STOMP refondu en 2 connexions (messaging + notifications). |
| 8 | **I7** | Accueil / Dashboard | ✅ (+2 ajouts) | ✅ | ✅ | **Livrée** : `AccueilHttpService` (dashboard, mentions, mes tâches). **Backend neuf** : `GET /users/me/tasks` (le gap `myTasks()` tranché — endpoint dédié plutôt que N+1 côté front) et `MentionResponse` enrichi (auteur, extrait, canal/conversation) pour « Mentions reçues ». `membersOnline` retirée (V5.1 §5.2). R1 déjà couverte par `adminGuard`. |
| 9 | **I9** | Recherche globale | ✅ **développé** | ✅ | ✅ | **Livrée** : `GET /search?q=` dans **4 services** (Project : projets+tâches R15 · GED : dossiers+fichiers **REF G** · Messaging : canaux+messages **REF F** · Auth : personnes). Agrégation **côté frontend** (forkJoin des 4, tolérant aux pannes) plutôt qu'un orchestrateur Gateway — même résultat, aucun service neuf. Overlay : requête serveur debouncée (250 ms), navigation par UUID. |
| 10 | **I10** | Rapports PDF | ✅ **développé** | ✅ | ✅ | **Livrée** : **OpenPDF** (dép. ajoutée au pom project-service) + `ReportService` réutilisant `DashboardService`/overview (aucune nouvelle donnée). Les 2 stubs 501 remplacés par de vrais PDF `application/pdf` + `Content-Disposition`. Droits : chef+ADMIN (projet), ADMIN R1 (global). Front : `ReportsService` (téléchargement blob) + boutons branchés avec spinner. |

### Bloc final — Meetings (en dernier)
| Ordre | Phase | Intitulé | Backend | Frontend | Statut |
| :-: | :-: | :- | :-: | :-: | :-: |
| 11 | **I8** | Meetings — intégration socle (+ `jitsiUrl`/`jwt`) | ✅ (M1) | ✅ | ✅ | `MeetingsHttpService` (history/active/create/join/leave/end/hide/remove/inviteParticipants/inviteGuest). `lancer` crée un appel réel → ouvre la salle. |
| 12 | **M4** | Intégration fine IFrame API JaaS | n/a | ✅ | ✅ | Composant `salle-reunion` : charge `external_api.js`, `JitsiMeetExternalAPI`, events `videoConferenceJoined`/`readyToClose`→`startCall`/`endCall`. Non exerçable sans clé JaaS réelle. |
| 13 | **M2** | Persistance du chat de réunion (**F5**) | ✅ **développé** | ✅ | ✅ | **Backend neuf** : entité `MeetingMessage` + repo + `MeetingChatService` + `POST/GET /calls/{id}/messages` (réservé participants). Front : `MeetingChatService` capte `incoming/outgoingMessage` → POST. |
| 14 | **M3** | Approbation des participants (lobby JaaS) | ✅ **développé** | ✅ | ✅ | **Backend** : `JitsiTokenService` émet `lobby_bypass` = `true` pour hôte + membres conviés (`invitedExplicitly`), `false` pour externe et membre non convié. Front lobby (knocking) : activable dans la config salle. |
| — | **M5** | Partage de fichiers en réunion | — | — | 🔮 Perspective (reporté) |
| — | **M6** | Enregistrement de la réunion | — | — | 🔮 Perspective (reporté) |

**M2 · détail du reste backend** : entité `MeetingMessage` + repository + `POST/GET {meeting}/calls/{id}/messages`
(la table `meeting_messages` existe déjà, vide, endpoints différés en Phase 9).

**M3 · détail du reste backend** : `JitsiTokenService` doit ajouter le claim `lobby_bypass: true` pour l'hôte
et les membres **conviés explicitement** (`CallParticipant.invitedExplicitly`, déjà renseigné en base mais
**non lu** par le service), et l'omettre pour l'invité externe et le membre **non convié** — qui passent alors
par la salle d'attente. La v5 prévoit aussi une **expiration plus courte** pour le JWT vidéo de l'invité
externe, alors que `TOKEN_TTL_SECONDS = 3600` s'applique aujourd'hui à tous.
La **visibilité** est en revanche déjà correcte côté backend : `GET /calls/active` ne renvoie que les appels
dont l'appelant est participant convié ou hôte — un membre non convié ignore l'existence de l'appel.

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
- **Bascule progressive par domaine** : `environment.useMock` (booléen) → `environment.mock` (objet de
  drapeaux par domaine : auth/projects/tasks/members/channels/conversations/ged/notifications/accueil/meetings/search).
  À chaque fin de phase, le drapeau du domaine intégré passe à `false` → testable en réel dans le navigateur,
  le reste reste en mock. `environment.prod.ts` = tout à `false`. Adaptés : `data.providers.ts`, `app.config.ts`,
  `auth.guard.ts`. **Aucun flip global en fin de projet.**

#### I1 · Auth & Workspace — ✅ Livré (I1a→I1d) · 🚧 lot de corrections en attente de validation
- **I1a — Auth core + redirection** : `connexion`/`inscription` → formulaires réactifs + `dispatch(login/register)` réels ;
  erreurs backend inline ; `authGuard` redirige non-connecté vers **`/auth/landing`** (page d'accueil) ; `logout` → landing ;
  `loginSuccess` → sélecteur d'espaces, `register` → verify.
- **I1b — Workspaces & session** : `WorkspaceService` (abstrait + Mock + Http) sur `/workspaces*`, `/workspace-members/leave` ;
  `SessionService` charge la vraie liste (`loadWorkspaces`), `enterWorkspace(id)` scelle le token (`refresh(workspaceId)`
  → claim `organisationId`/`orgRole`), `switchWorkspace` idem, `createWorkspace`/`updateActiveWorkspace`/`leaveWorkspace`/
  `deleteActiveWorkspace` délèguent au backend. Recâblés : sélecteur (liste réelle), inviter-equipe (crée le 1ᵉʳ espace),
  header (switch), Paramètres Général (renommer/supprimer) + Espaces (quitter), workspace-create modal.
- **Bascule** : `environment.mock.auth = false` → auth + workspaces en **backend réel**. Reste en mock : projets, tâches,
  GED, canaux, etc. (drapeaux séparés).
- **Build** : `ng build` vert (mock ET réel).
- **I1c — Mot de passe / invitations / membres** (livré) :
  - **Reload persistence** : `SessionService.restoreSession()` (constructeur) — décode le JWT (`core/util/jwt.util.ts`) pour
    restaurer le workspace actif + `GET /users/me` pour réhydrater le profil après un rechargement de page.
  - **Reset mot de passe** : `saisie-email` → `POST /auth/password/reset-request` ; `nouveau-mot-de-passe` → `POST /auth/password/reset`
    (token lu du query param). `AuthService` étendu (`passwordResetRequest`, `passwordReset`, `verifyEmail`).
  - **Acceptation d'invitation** : `rejoindre-invitation` charge le contexte (`GET /invitations/{token}`) + `POST /invitations/{token}/accept`
    → `SessionService.establishSession` (token déjà org-scopé). `AuthService.getInvitation`/`acceptInvitation`.
  - **Paramètres ▸ Membres** : charge `GET /workspaces/{id}/members` (avec `userId`/`memberId`) ; changer rôle
    (`PATCH /workspace-members/{id}/role`), activer/désactiver (`/active`), retirer (`DELETE`).
  - **Paramètres ▸ Invitations** + **modal d'invitation** : `GET/POST /workspaces/{id}/invitations`, relancer (`/invitations/{id}/resend`),
    annuler (`DELETE /invitations/{id}`). Le modal existant `shared/overlays/invitation` envoie réellement.
  - **`WorkspaceService` étendu** (pas de nouveau service, respect du frontend) : `members`, `changeMemberRole`, `toggleMemberActive`,
    `removeMember`, `invitations`, `sendInvitations`, `resendInvitation`, `cancelInvitation`. Modèle `Member` + `userId` ;
    nouveaux `WorkspaceMemberAdmin`/`WorkspaceInvitation`.
  - **`WorkspaceService` étendu** (pas de nouveau service, respect du frontend) : `members`, `changeMemberRole`, `toggleMemberActive`,
    `removeMember`, `invitations`, `sendInvitations`, `resendInvitation`, `cancelInvitation`.
- **I1d — Emails réels, vérification, profil, sécurité** (livré) :
  - **Emails réels** : cause racine = **proxy TLS intercepteur du réseau** (cert auto-signé → « Could not convert socket to TLS »,
    même cause que Maven PKIX). Fix : `mail.smtp.ssl.trust: ${SMTP_SSL_TRUST:*}` dans `config-repo/nexawork-auth.yml`.
    **Emails partent réellement** (reset envoyé à Gmail, vérifié dans les logs). En prod sans proxy, retirer ce trust.
  - **Blocage login non-vérifié** : `login()` refuse (`ForbiddenException`) si `!emailVerified` (backend).
  - **Lien de vérification** : `verification-email.component` consomme `?token=` → `POST /auth/verify-email` → redirection login.
  - **Profil** : `UserProfileService` chargé via `GET /users/me`, sauvé via `PATCH /users/me/profile` (prénom/nom/fonction réels).
    Photo affichée localement (persistance MinIO via File Service = à faire, `photoUrl` VARCHAR(1024) ≠ base64).
  - **Sécurité** : email réel affiché ; mot de passe (`PATCH /users/me/password`), email (`POST /users/me/email`),
    lien reset (`POST /auth/password/reset-request`). `AuthService` étendu (`updateProfile`/`changePassword`/`changeEmail`).
- **Setup de test opérationnel** : 6 conteneurs (config-server, postgres, rabbitmq, auth-service, api-gateway, frontend) via
  Docker + accès navigateur **http://localhost:4200** (nginx proxifie → gateway interne, contourne le gel de `:8080`).
  Ports Java hôtes (`:8080`/`:8081`) gelés par Docker Desktop → on teste **uniquement via :4200**. `register` prouvé (HTTP 201).
- **Reste I1** : persistance photo de profil via File Service (avatar) — à faire avec I5.

##### 1bis · Lot de corrections Auth — ✅ validé live (2026-07-10)
Buildé (`auth-service` + `api-gateway` + `frontend`), testé en navigateur, V5.1 aligné.

| # | Problème constaté | Cause racine | Correctif |
| :-: | :- | :- | :- |
| 1 | 2 emails à l'inscription | Image Docker périmée (le code n'en envoyait déjà qu'un) | `sendWelcomeEmail` supprimé (interface + impl) |
| 2 | Invitation → renvoi au login, « identifiants incorrects » | **Gateway** : `PublicPathMatcher` déclarait `/invitations/*` public, or l'AntPathMatcher `*` ne matche **qu'un segment** → `/invitations/{token}/accept` (2 segments) exigeait un JWT → **401** → compte jamais créé | Ajout de `/nexawork-auth-api-v1/api/v1/invitations/*/accept` à la liste blanche |
| 3 | Annulation d'invitation → **403** alors qu'OWNER | **Frontend** : `jwt.interceptor` traitait tout `/api/v1/invitations/` comme public → **pas de Bearer** sur `DELETE`/`resend` | Exception « publique » rendue **méthode-consciente** (GET contexte + POST `…/accept` seulement) |
| 4 | Changement d'email : « Utilisateur introuvable », `window.prompt` natif | Le même endpoint `verify-email` rétablissait une session alors que l'ancien JWT porte **l'ancien email** en `subject` | Nouveau `ActionTokenType.EMAIL_CHANGE` + `POST /auth/email/confirm-change` (swap + **révocation de toutes les sessions**, 204) ; route front `/auth/email-change` → logout + redirection login ; **modal** design-system |
| 5 | Règles MDP trop strictes | Front imposait majuscule + chiffre (backend déjà `@Size(min=8)`) | Critère unique **≥ 8 caractères**. Invalidation des sessions déjà en place (reset + change) |
| 6 | Blocs **SIMU** résiduels | — | Retirés de `page-accueil` (landing) et `lien-envoye` (`/auth/forgot/sent`) |
| 7 | Périmètre du service Auth | — | **Vérifié conforme** : membres / invitations / rôles / accès workspace = Auth. ACL **ressource** (GED, canaux, projets) = leurs services respectifs, via headers d'identité Gateway |
| 8 | Invitation d'un email **déjà inscrit** | `accept()` levait une erreur | `accountExists` dans le contexte ; `POST /invitations/{token}/join` (authentifié, email vérifié) ; page à **3 parcours** : inscription / connexion inline / 1 clic si déjà connecté |

**Seconde vague (2026-07-10), issue des tests navigateur :**

| # | Problème | Cause racine | Correctif |
| :-: | :- | :- | :- |
| 9 | Toast « Le serveur ne répond pas » **intermittent** | **`SPRINGDOC_ENABLED=true`** : l'init springdoc prend **81 s** (mesuré) et sature le CPU → dépasse le timeout de 20 s du frontend | `SPRINGDOC_ENABLED: ${SPRINGDOC_ENABLED:-false}` — activable ponctuellement. *(Aussi : famine de threads Hikari, `config-server` à 120 % CPU — l'arrêter après le boot libère un cœur.)* |
| 10 | Onboarding en 2 étapes | Étape 2 « Invitez votre équipe » redondante avec Paramètres ▸ Invitations | **Étape unique** : `configuration-espace` crée l'espace et y entre. `inviter-equipe` **supprimé** (composant + route + signaux `emails`/`role`). `SessionService.createWorkspace()` gagne un callback d'échec (sinon bouton bloqué sur 409 slug). |
| 11 | Données **mock** visibles une fraction de seconde au rechargement | `SessionService.fallbackView()` renvoyait les constantes mock tant que `loadWorkspaces()` n'avait pas répondu | Placeholder neutre en backend réel. **Bug plus grave corrigé au passage** : le repli renvoyait `role: 'OWNER'` → `isAdmin` brièvement vrai pour tous (`adminGuard` laissait passer). Le rôle vient désormais du claim JWT `orgRole`. |
| 12 | Invitation **acceptée** toujours affichée « En attente » | `list()` renvoyait tous les statuts ; le front ignorait `status` | Backend : `findAllByOrganisationIdAndStatusNot(..., ACCEPTED)`. |
| 13 | Bouton « Créer mon compte » cliquable avec mots de passe différents → **email envoyé quand même** | `canSubmit` calculé mais **jamais utilisé** (bouton lié à `loading()` seul) | `[disabled]="!canSubmit() \|\| loading()"` + garde dans `submit()`. Message inline « ≥ 8 caractères » ajouté (inscription + invitation). |
| 14 | Bouton affichant `{{ busy() ? … }}` en clair | Dans un *template literal* TS, `\'` devient `'` → expression Angular invalide | Guillemets doubles : `{{ busy() ? "Connexion…" : "Rejoindre l'espace" }}`. |

**Aucune migration DB** (`user_action_tokens.type` est un `VARCHAR(50)`) · **aucun changement de config-repo**.
`docker-compose.yml` : `SPRINGDOC_ENABLED` désactivé par défaut. Swagger (si activé) s'ouvre via
`http://localhost:4200/nexawork-auth-api-v1/swagger-ui/index.html` — les ports Java hôtes (`:8080`/`:8081`) sont gelés par Docker Desktop.

### Détail des phases livrées (suite)

#### I2a · Projects + board Kanban (lecture + drag-drop) — ✅ Livré (2026-07-10)
Bascule : `environment.mock.projects = false`, `.tasks = false`. `ng build` vert (mock ET réel).

- **Créés** :
  - `core/models/project.models.ts` (réécrit) : `Project` en **UUID** (+ `prefix`/`status`/`ownerUserId`/`memberCount`/
    `startDate`/`endDate`/`enforceWorkflowOrder`/`lastModifiedDate`), `ProjectResponse`, payloads. **`progress` retiré.**
  - `core/models/task.models.ts` (réécrit) : `TaskCard` (+ `taskKey`/`projectId`/`statusId`/`priority`/dates), `KanbanColumn`
    (+ `position`/`isInitial`/`isFinal`), `StatusResponse`/`TaskResponse`, payloads. **`prog` retiré.**
  - `core/util/task-display.util.ts` : mapping payloads→affichage (priorité→tuple, catégorie→`cat`, `dueDate`→bucket,
    `TaskResponse`→`TaskCard`, `StatusResponse`→`KanbanColumn`).
  - `core/util/ui.util.ts` : `tintOf()` (fond teinté d'une couleur libre), `avatarColorFor()`/`AVATAR_COLORS` (couleur
    d'avatar déterministe par UUID — partagée avec les futurs domaines).
  - `core/services/data-refresh.service.ts` : `DataRefreshService` (compteur `projects` bumpé après mutation → les
    listes chargées par `workspaceSignal` refetchent sans recharger la page).
- **Services** :
  - `projects.service.ts` : contrat étendu (`create`/`update`/`archive`/`restore`/`remove`/`listArchived`) + `ProjectsMockService`
    + **`ProjectsHttpService`** (`/projects`, `/projects/{id}`, `/archive`, `/restore`, `/archived-projects`).
  - `tasks.service.ts` : contrat **remanié** — `loadBoard(projectId)` (forkJoin statuts+tâches en 1 appel),
    `cardById(id)` **async**, `createTask`/`deleteTask`/`changeStatus` + Mock + **`TasksHttpService`**.
  - `data.providers.ts` : bind conditionnel `Projects`/`Tasks` (mock↔http).
- **Composants recâblés** : `kanban.store.ts` (reçoit `projectId`, charge via `loadBoard`, **drag-drop optimiste →
  `changeStatus` avec revert sur 422 + toast « [taskKey] déplacée vers « [Statut] » »** conforme V5.1 §8),
  `kanban.component.ts` (carte affiche `taskKey`, `tintOf` pour couleurs libres), `projet-shell.component.ts`
  (pousse `projectId`, archive/restore/delete réels, `switchTask` async), `creer-projet` (→ `projects.create`),
  `projets-archives` (→ `listArchived` + restore/remove réels), `app-shell` (`cardById` async, navigation post-création,
  bump refresh), `sidebar-2` (retrait du `%` vestige, refresh), `archived-projects.service.ts` (masquage local instantané,
  seed mock retiré).
- **Fixtures mock** réécrites au **format payload backend** (`MOCK_STATUSES`/`MOCK_TASKS`, `PROJECTS_BY_WORKSPACE`/
  `ARCHIVED_PROJECTS`) → mock et réel produisent exactement les mêmes cartes.
- **V5.1** : §6 sidebar « Tous les projets » corrigée (**pas de %** ; progression en Vue d'ensemble + Dashboard).
- **Reste I2 (à faire)** :
  - **I2b** — `creer-tache` (statuts/priorité réels), `fiche-tache` (sous-tâches, commentaires, pièces jointes) + **File
    Service** (upload `context=task-attachment`) + **backend neuf** `comment_attachments` (migration `V3`, §5 plan).
  - **I2c** — modals `Statuts`/`Workflow` (persistance `/statuses`,`/transitions`,`/workflow`), `vue-d-ensemble`
    (`/overview`), `gantt`.
- **Limites connues I2a** (levées dans les sous-phases) : board d'un projet neuf = colonnes seedées + 0 tâche
  (le drag-drop se valide en I2b, avec la création de tâche) ; filtre « Assigné à » (Kanban) et « Chef de projet »
  (archives) attendent l'annuaire membres (**I3**) ; les modals Statuts/Workflow et le menu ⋯ de colonne mutent encore
  le store en **local** (persistés en I2c).

#### I2b · Création de tâche + fiche complète + commentaires/PJ — ✅ Livré (2026-07-10)
Domaine `tasks` (déjà en réel depuis I2a). `ng build` vert (dev + prod). **Nécessite le rebuild `project-service`**
(migration `V3` + entité `comment_attachments`).

- **Backend (dev neuf)** — pièces jointes de commentaire :
  - `V3__comment_attachments.sql`, entité `CommentAttachment`, `TaskComment` (`@OneToMany` cascade + `addAttachment`),
    `CommentAttachmentRequest`/`Response`, `CreateCommentRequest.attachments`, `CommentResponse.attachments`,
    `CommentMapper` (mapping imbriqué), `TaskCommentServiceImpl` (persistance + **texte optionnel si ≥ 1 fichier**).
- **Frontend** :
  - `core/http/files.http.service.ts` : `FilesHttpService` (upload multipart `context=task-attachment` avec
    `workspaceId`/`projectId`/`taskId`, `download` blob). Réutilisable en I5 (GED, avatar).
  - `task.models.ts` : `SubTask`, `TaskComment`, `AttachedRef`, `TaskAttachment` (+ types `*Response`), `UpdateTaskPayload` câblé.
  - `tasks.service.ts` : contrat étendu — `updateTask`, `subtasks`/`addSubtask`/`setSubtaskDone`/`removeSubtask`,
    `comments`/`addComment`(upload)/`removeComment`, `attachments`/`addAttachment`(upload)/`removeAttachment` (Mock + Http).
  - `comment-composer` : conserve le **vrai `File`** + émet le **texte brut** (2 champs additifs, non cassants).
  - `creer-tache` : création réelle (`createTask` sur statut de colonne réel + priorité + dates + estimation),
    puis création des sous-tâches ; insertion dans le board sans recharger (`store.addCard`).
  - `fiche-tache` : **recâblée** — chargement du détail, édition titre/description (`updateTask` au blur),
    sous-tâches (toggle/ajout/retrait optimistes), commentaires (rendu `parseRichText` + ajout avec upload + retrait),
    pièces jointes de tâche (upload/téléchargement/retrait), suppression de tâche (`(deleted)` → board).
  - `projet-shell`/`app-shell` : handlers `onTaskCreated`/`onTaskDeleted` ; le Kanban émet désormais l'**id** du statut.
- **Limites connues I2b** (levées en I3) : **assigné** non transmis (sélecteur présent mais annuaire vide) ;
  **auteurs de commentaire** affichés « Moi » / « Membre » (résolution des noms = I3) ; suggestions de **mentions** du
  composeur = catalogue mock (câblé avec canaux/membres, I4/I3). Le **texte** des commentaires, lui, est bien persisté.

#### I2c · Statuts + Workflow persistés, Vue d'ensemble, Gantt — ✅ Livré (2026-07-10)
Aucun backend neuf (endpoints `/statuses`, `/transitions`, `/workflow`, `/overview` déjà livrés). `ng build` vert (dev + prod).

- **`tasks.service.ts`** étendu : `createStatus`/`updateStatus`/`deleteStatus`, `transitions`, `updateWorkflow`, `overview`
  (Mock + Http). Modèles `Transition`/`TransitionResponse`, `WorkflowUpdatePayload`, `ProjectOverviewResponse`.
- **`KanbanStore`** : les mutations de statut **persistent** — `commitRename` (blur → PATCH nom), `setColor` (PATCH couleur),
  `deleteColumn` (DELETE + revert sur 409), `addColumnAsync` (POST puis insertion), `moveStatus`/`reorderStatus`
  (réindexation + PATCH positions). Le menu ⋯ de colonne du board persiste donc aussi (achève I2a).
- **`statuts.component`** : rename (blur), couleur, ajout (async), suppression, drag-drop entre catégories → tous persistés ;
  titre du modal = nom réel du projet.
- **`workflow.component`** : étapes = colonnes réelles (monter/descendre → positions), bascule `enforceWorkflowOrder`,
  responsables de transition **par rôle** (Tous → `ALL`, Chef de projet → `PROJECT_LEAD`) via `PATCH /workflow`.
  Transitions **réelles** chargées (`GET /transitions`). Responsable « membre spécifique » différé à I3.
- **`vue-d-ensemble`** : `GET /projects/{id}/overview` → avancement %, terminées/total, en retard, membres, donut
  « répartition par catégorie de statut », échéances proches (`upcomingDueTasks`). Colonne « Responsable » = « — » (I3).
- **`gantt`** : planning dérivé du board (`loadBoard`) — colonnes en semaines ISO calculées depuis les dates réelles
  des tâches, barres `start`/`span`, avancement conventionnel par catégorie. Filtre « Assigné à » vide (I3).
- **Limites connues I2c** (levées en I3) : filtre Gantt « Assigné à », responsable « membre spécifique » du Workflow,
  et « Responsable » des échéances attendent l'annuaire des membres.

## 3 · Décisions/gaps (voir plan §5)

**✅ Tranchés**
- **Recherche globale (I9)** : à **implémenter réellement** — endpoints `search` internes (ILIKE) par service + agrégation Gateway.
- **Rapports PDF (I10)** : à **implémenter réellement** — OpenPDF côté Project Service.
- **Meetings** : **M2** (chat persistant) dans le périmètre ; **M5/M6** en perspective (2026-07-08).
- **Abstraction visio** (`VideoConferencePort`) : **non implémentée** — présentée en **évolution cible** dans V5.1 §9.9.1 (intégration JaaS directe assumée).

**⏳ Encore à trancher**
- **`myTasks()`** (I7) : dériver côté frontend depuis `/projects/{id}/tasks` **ou** ajouter `GET {project}/users/me/tasks`.
- **`progress`/`docs`/`folders`** d'un projet (I2) : dériver (tâches done/total ; comptes GED) **ou** enrichir `ProjectResponse`.

**🧹 Nettoyages actés à faire dans leur phase**
- **`membersOnline`** (I7) : champ frontend d'une KPI supprimée → retirer.
- **`taskKey`** (I2) : à ajouter sur `TaskCard` (ID mono affiché sur les cartes).
- **`jitsiUrl`/`jwt`** (I8) : à ajouter au modèle Meeting / DTO de lancement.

---

## 3bis · Setup d'exécution (tout-Docker, parité prod)

**Décision (2026-07-06)** : tout tourne dans Docker, y compris le frontend, pour tester exactement ce qui
ira en prod. Le frontend est servi par **nginx** qui fait aussi **reverse-proxy** vers la Gateway.

- **`nexawork-frontend/nginx.conf`** : sert l'app Angular (SPA) + proxifie `/nexawork-*` et `/ws/*` vers
  `api-gateway:8080` (réseau Docker interne). Le navigateur ne parle qu'à **une seule origine** (`localhost:4200`)
  → pas de CORS, et **contourne le port hôte `:8080`** (souvent gelé par Docker Desktop).
- **`environment.prod.ts`** : `apiUrl: ''` (même origine → nginx proxifie), `mock.auth=false`. Build image =
  `--configuration=production`.
- **`environment.ts`** (dev, `ng serve`) : `apiUrl: 'http://localhost:8080'` (appel direct gateway). Nécessite
  que le port hôte `:8080` réponde.
- **Workflow** : `docker compose up -d` (tout) → http://localhost:4200. Après un changement frontend :
  `docker compose build frontend && docker compose up -d frontend` (~5 min). Backend : `docker compose build <service> && up -d <service>`.
- **Piège** : après un changement de `nginx.conf` ou du code frontend, **l'image doit être reconstruite** —
  sinon le conteneur tourne encore l'ancienne version (symptôme observé : nginx sans proxy → 405 sur `/nexawork-*`,
  ancien message « Timeout has occurred »).
- **Emails SMTP — RÉSOLU** : le proxy TLS intercepteur cassait le handshake (« Could not convert socket to TLS »).
  Corrigé par `mail.smtp.ssl.trust: ${SMTP_SSL_TRUST:*}` dans `config-repo/nexawork-auth.yml` → **les emails partent
  réellement**. ⚠️ Le proxy reste **intermittent** : un envoi peut échouer (`SSLHandshakeException`) puis réussir
  juste après. Les envois sont `@Async` (`@EnableAsync` sur `NexaworkAuthApplication`) → un échec SMTP **ne bloque
  jamais** la requête HTTP. En prod sans proxy, retirer ce `ssl.trust`.
- **1ʳᵉ invitation lente (~10 s)** : la connexion RabbitMQ est créée **paresseusement** au premier `publish`
  (6 s pour l'établir). Normal, sous le timeout de 20 s. Les suivantes sont instantanées.

## 4 · Notes d'environnement (à connaître pour builder/tester)

- **🔴 springdoc / Swagger — le piège n°1 de cette machine.** `SPRINGDOC_ENABLED` est **désactivé par défaut**
  (`docker-compose.yml` : `${SPRINGDOC_ENABLED:-false}`). Son initialisation a été **mesurée à 81 s**
  (`Init duration for springdoc-openapi is: 81445 ms`) et sature le CPU → **dépasse le timeout de 20 s**
  du frontend (`error.interceptor`, `REQUEST_TIMEOUT_MS`) → toasts « Le serveur ne répond pas » **intermittents**,
  famine de threads Hikari, connexions PostgreSQL perdues. **Ne l'active jamais pendant les tests d'intégration.**
  Pour le consulter ponctuellement :
  `SPRINGDOC_ENABLED=true docker compose up -d --no-deps --force-recreate auth-service`
  puis **via nginx** (les ports Java hôtes sont gelés) : `http://localhost:4200/nexawork-auth-api-v1/swagger-ui/index.html`.
  Repasser à `false` ensuite.
- **🔴 Frontend : JAMAIS `docker compose build --no-cache frontend`.** Cela force `npm install` à retélécharger
  depuis `registry.npmjs.org` → le **proxy TLS** fait échouer le build (`exit code 1`). Un build **normal** suffit :
  `npm install` reste en cache (le `package.json` n'a pas changé) et seules les couches `COPY . .` + `npm run build`
  re-tournent. **Une date d'image inchangée après un build signifie simplement que le code était déjà à jour.**
- **`config-server` brûle ~120 % de CPU** en continu. Il n'est lu qu'**au démarrage** des services : une fois tous
  `healthy`, `docker compose stop config-server` libère un cœur. Le redémarrer avant tout `up`/`--force-recreate`
  d'un service backend.
- **Build Maven hôte Windows** : `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` + `JAVA_HOME=C:\Program Files\Java\jdk-21` (le mvn par défaut tourne en JDK 17). PowerShell découpe les args sur les points → passer par `MAVEN_OPTS`. **Le build Docker n'est pas affecté** (chemin canonique : `docker compose build <service>`).
- **Édition de `.sh`** : Edit/Write réécrit en **CRLF** sur ce poste → casse les scripts en conteneur Linux (`$'\r'`). Repasser en LF (`tr -d '\r'`) après édition. Les `.md` de `notes/` sont en CRLF (sans impact).
- **Validation live fiable** : le port hôte `localhost:8080` peut se figer après un recreate de conteneur (quirk Docker Desktop Windows, aggravé par la charge). Contournement : `docker run --rm --network nexawork_default curlimages/curl:latest -s http://<service>:<port>/...` en forgeant les headers `X-User-Id`/`X-Org-Id`/`X-Org-Role` (le `GatewayIdentityFilter` leur fait confiance ; permet aussi de tester REF B 403/200 en changeant `X-Org-Role`).
- **PostgreSQL** : user/db `postgres` (conteneur `nexawork-postgres`), 7 bases `nexawork_*_db`. Flyway checksum mismatch (résidus) → `DROP DATABASE ... WITH (FORCE); CREATE DATABASE` puis redémarrer le service.
- **Testcontainers** : Docker Desktop renvoie 400 sur `/info` → tests d'intégration conditionnés `RUN_INTEGRATION_TESTS=true` (ignorés par défaut, build vert).

---

## 5 · Git
- Repo code : `nexawork` — branche de travail **`backend/dev`**. Remote `github.com/khalifakim/nexawork.git`.
- Repo docs : `docs-config` — branche **`main`**.
- **L'assistant ne commite jamais** : il propose les blocs (Bloc A = `nexawork`, Bloc B = `docs-config`), l'utilisateur exécute. **Pas de trailer `Co-Authored-By`.**

**État au 2026-07-10** : `HEAD` = `backend/dev` = `main` = `origin/backend/dev` = `origin/main` = **`36606e9`**
(alignement parfait, arbre propre).

**TLS** : Git utilisait le backend `openssl` (imposé au niveau **système**), dont le magasin ignore le certificat du
proxy intercepteur → `git fetch` échouait. Corrigé une fois pour toutes par :
`git config --global http.sslBackend schannel` (délègue la validation au magasin Windows). **Ne jamais** utiliser
`http.sslVerify false`.

**⚠️ Ne PAS faire `git checkout main` depuis `backend/dev`.** Les deux branches diffèrent de milliers de fichiers ;
la bascule réécrit tout l'arbre et un verrou Windows (IDE/antivirus) sur `.git/HEAD` a déjà **interrompu un checkout
en plein milieu** (HEAD resté sur `backend/dev`, arbre de travail passé sur `main` → faux diff géant).
*Récupération si ça arrive* : `git reset --hard HEAD` (sûr si tout est commité).

**Merge `backend/dev` → `main` sans toucher un seul fichier** (méthode à utiliser) :
```bash
git push origin backend/dev:main      # fast-forward cote serveur (refuse si divergence)
git fetch origin --prune
git branch -f main origin/main        # deplace le pointeur local, sans checkout
```
