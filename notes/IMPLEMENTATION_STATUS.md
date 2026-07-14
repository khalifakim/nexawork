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

---

## 2bis · Corrections post-test (session navigateur)

### Lot du 2026-07-13 — canaux, mentions, « Mes tâches » (frontend uniquement)
**Rebuild requis : `frontend` seul.** Aucun changement backend, aucune migration.

| # | Symptôme constaté | Cause racine | Correctif |
| :-: | :- | :- | :- |
| 1 | Canal créé (lecture seule) → toast « Ce canal est privé, vous n'y avez pas accès » **à son créateur** | `ChannelsService.create()` était **optimiste** : POST en *fire-and-forget* puis navigation immédiate. Le `channelAccessGuard` rechargeait la liste **avant** que le POST ne soit commité → slug absent → « canal privé » (REF F, doctrine 404-not-403) | `create()` renvoie un `Observable<Channel>` résolu sur la réponse serveur ; le modal ne navigue qu'après persistance (bouton « Création… »), et amorce le cache slug→UUID |
| 2 | *(trouvé en corrigeant #1)* Un canal **de projet** naissait canal **d'organisation** | Le `projectId` n'était **jamais transmis** au POST (le backend `CreateChannelRequest` l'accepte pourtant) | `CreateChannelPayload.projectId` + `ShellBus.openNewChannel(scope, project)` ; le « + » sidebar et le bouton « Créer un canal » de l'onglet Canaux portent le projet |
| 3 | *(idem)* Le groupe « Canaux Projets » de la sidebar ne s'affichait **jamais** en backend réel | Il se reposait sur `Channel.project` (**nom**), que le payload ne porte pas — seul `projectId` existe | Le nom du projet propriétaire est résolu depuis la liste des projets (déjà chargée par la sidebar). Le filtre « projet archivé » compare désormais des `projectId`, non des slugs de nom |
| 4 | Mention `@@tâche` non cliquable (500 / rien) | La mention porte la **clé lisible** (`MOB-101`), pas l'UUID — or tous les points d'ouverture appelaient `cardById()` avec cette clé | `TasksService.cardByRef()` : UUID → lecture directe ; clé → résolution via `GET project /search?q=` (qui indexe `task_key` et applique déjà R15), puis lecture. Branché sur `app-shell`, `projet-shell`, `mes-taches`, `mentions-recues`. *(`@personne`, `@@@document` et `#canal` se résolvaient déjà par nom/slug.)* |
| 5 | « Mes tâches » : section **« Sans échéance »** alors qu'une échéance est saisie | `AccueilHttpService.myTasks()` inventait 4 sections (retard / semaine / mois / sans échéance) via `dueBucket()`, qui **rend `undefined` au-delà de 31 j** → la tâche tombait dans « Sans échéance ». Contraire à **V5.1 §5.1** (« Aujourd'hui et en retard », « pas de ligne Non planifiées ») | Deux sections **Aujourd'hui** + **En retard**. ⚠️ Conséquence assumée (conforme §5.1) : une tâche à échéance plus lointaine **n'apparaît pas** sur cet écran |
| 6 | Colonne mono = **UUID** de la tâche ; colonne « Projet » = sa clé | `toMyTaskRow()` mettait `taskKey` dans `proj`, et le template affichait `t.id` | `MyTaskRow.key` (clé lisible) affichée en mono ; `proj` = **nom du projet**, résolu depuis la liste des projets (`TaskResponse` ne le porte pas) |
| 7 | Clic sur une tâche de « Mes tâches » → **500** + `GET /projects/undefined/statuses` | La fiche recevait une carte **fabriquée à la main** (sans `projectId` ni `statusId`) → `loadBoard(undefined)` | La ligne ouvre la **vraie** carte (`cardById`). Même correction dans « Mentions reçues », qui fabriquait aussi la sienne |

### Lot du 2026-07-13 (soir) — WebSocket, présence, canaux auto, réunions
**Rebuild requis : `api-gateway`, `meeting-service`, `frontend`.** Aucune migration.

| # | Symptôme constaté | Cause racine (**mesurée**) | Correctif |
| :-: | :- | :- | :- |
| 8 | **WebSocket en échec permanent** (`/ws/notifications`, `/ws/messaging`) | **L'image `api-gateway` datait de 4 jours** : le correctif « `/ws/**` en liste blanche » (commit `79c9916`, du matin même) **n'avait jamais été construit**. Mesuré : handshake → **401**. *(Piège n°1 du handoff, en vrai.)* | **Rebuild** de `api-gateway`. **Toujours vérifier l'âge de l'image avant de conclure à un bug de code.** |
| 9 | Même public, le handshake **n'apporte aucune identité** → `/user/queue/notifications` muet, **présence jamais alimentée** | Les deux services lisent l'identité dans l'en-tête **`X-User-Id` posé par le gateway**. Or un chemin public **saute le filtre JWT** → aucun en-tête. Et un **WebSocket natif ne peut pas porter `Authorization`** : le jeton n'atteignait donc jamais le serveur. Aucun `ChannelInterceptor` ne lisait la trame CONNECT. **Résultat : session STOMP sans `Principal`.** | Le jeton voyage en **query string** (`?access_token=`), seul canal disponible. Le gateway le valide sur `/ws/**` et **propage les en-têtes d'identité** — sans jamais rejeter (le chemin reste public → pas de boucle de reconnexion). Front : `webSocketFactory` reconstruit l'URL **à chaque reconnexion** (un `brokerURL` figé rouvrirait avec un jeton périmé). |
| 10 | **Tous les membres « hors ligne »** dans les conversations | `MembersHttpService.directory()` **ne croisait jamais** `/presence/online` : `online` restait à `false` partout (fiche profil, en-tête de conversation, page Membres). Seule `online()` (2 vues) interrogeait la présence. | Flux de présence **partagé et rafraîchi toutes les 20 s** (un seul appel pour tous les abonnés) ; `directory()` le fusionne, `online()` devient un **flux vivant** (les vues suivent connexions/déconnexions sans rechargement). Un échec vaut « personne en ligne » et ne casse aucune vue. |
| 11 | Canaux **#général / #annonces** « non créés » à la création d'un projet | **Faux problème** : les logs et la base montrent que le consumer `project.created` **les a bien créés**. Ils étaient **invisibles** : le groupe « Canaux Projets » de la sidebar ne s'affichait jamais (cf. #3 du lot précédent). | Rien à corriger côté backend — **résolu par le correctif #3**. |
| 12 | Réunion : **409 Conflict** sur toute création | `create()` posait `joinedAt = now()` sur l'hôte → **REF A le comptait « déjà en appel » avant même d'entrer dans la salle**. La salle ne s'ouvrant jamais, l'appel restait `ACTIVE` **indéfiniment** → 409 sur toute création suivante, **sans aucun moyen d'en sortir**. | L'hôte est convié (`invitedExplicitly`) mais **`joinedAt` reste nul** : il n'entre qu'en rejoignant réellement (`join()`). + le front **quitte l'appel à la fermeture de la fenêtre** (`fetch keepalive` — une requête Angular est annulée avec le document). |
| 13 | Réunion bloquée sur **« Connexion à la salle… »** | Le voile de chargement n'était levé qu'à l'événement `videoConferenceJoined`. Tant qu'il ne venait pas (autorisation caméra, salle d'attente, jeton refusé), **notre overlay masquait l'iframe JaaS** — qui pouvait très bien fonctionner dessous. | L'iframe est révélée **dès qu'elle est montée** ; les erreurs de chargement deviennent de vraies erreurs affichées. |
| 14 | « Invités internes » : **liste vide** | Le modal était **encore entièrement mock** (5 personnes codées en dur) et n'émettait **ni `memberIds` ni les emails externes**. | Membres **réels** (`MembersService.others()`), `memberIds` transmis → le backend notifie les conviés (`meeting.participant.invited`). Emails externes → `POST /calls/{id}/guests` (lien à usage unique **envoyé par email**, consumer déjà en place). |
| 15 | Invité externe : **le lien de l'email ne menait nulle part** | La route **`/guest/{token}` n'existait pas** dans le SPA → repli `**` → login. L'invité n'a pourtant pas de compte. | **Page publique `salle-invite`** (`GET /guest/{token}` → JWT JaaS non modérateur). Montage JaaS mutualisé (`core/util/jitsi.util.ts`) entre membre et invité. |
| 16 | Pas d'indicateur pendant la création ; salle ouverte **dans** l'app | — | Bouton « Création… » ; la salle s'ouvre dans une **fenêtre dédiée** (`/salle/:id`, hors shell), l'app restant utilisable derrière. |
| 17 | Bannière « Appel en cours » invisible pour les autres participants | Elle était pilotée par un **signal local** (`session.startCall`), posé uniquement dans la fenêtre de la salle → invisible partout ailleurs. Le popover affichait en plus des **participants mock** (« Sarah, Moussa et 3 autres »). | Bannière tenue par le **serveur** : `GET /calls/active` (n'expose que les appels dont l'appelant est hôte ou convié) interrogé toutes les 15 s. Avatars mock supprimés ; « Quitter » appelle réellement `leave`. |

> **⚠️ Le swap remonte pendant un `docker compose build frontend`** (le build Angular consomme ~1-2 Go dans le
> conteneur, en plus des 14 services). Mesuré ce soir : swap **1 → 744 Mo**, et une **famine Hikari à 19:07**
> (`Connection is not available, request timed out after 43 s`) — exactement le mécanisme décrit en §4. Ce n'est
> pas une régression du correctif mémoire : c'est le **build** qui pousse la VM en swap. Éviter de tester
> pendant un build. *(Connexions PostgreSQL vérifiées : 8 — le pool tient.)*

> **`GET /tasks/{id}` renvoie 500 sur un id non-UUID** (`Invalid UUID string: 1PT-1`, vu en logs — c'était le
> symptôme des mentions de tâche). Le frontend n'envoie plus de clé, mais le service **devrait répondre 400** :
> `MethodArgumentTypeMismatchException` n'est pas mappée dans `GlobalControllerExceptionHandler` (commons).
> Non corrigé : la classe est partagée → **rebuild des 9 services** pour un cas désormais sans appelant.

### Lot du 2026-07-13 (nuit) — mentions rattachées, canaux privés réels, 400 vs 500
**Rebuild requis : `messaging-service`, `notification-service`, `project-service`, `frontend`** + **`rabbitmq-init`**
(nouvelle queue `nexawork.notification.mention`). Aucune migration.

| # | Symptôme | Cause racine | Correctif |
| :-: | :- | :- | :- |
| 18 | **« Mentions reçues » (§5.3) toujours vide**, aucune notification de mention | `MessageMention.targetId` n'était **jamais** renseigné : `MentionParser` n'extrait que le **texte** mentionné — les utilisateurs, tâches, documents et canaux appartiennent à **d'autres domaines**, le Messaging ne peut pas les résoudre. Or `listReceived()` filtre sur `targetId = utilisateur courant` → la vue ne pouvait rien trouver, **jamais**. | Le **client** connaît la cible à la saisie (son catalogue de mentions est déjà réel). `SendMessageRequest.mentions` porte `{type, targetId, targetText}` ; `MessageAssembler` les rattache aux mentions que le **parser** trouve réellement dans le texte — **le contenu reste la source de vérité** sur ce qui est mentionné, la requête n'apporte que l'identifiant. |
| 19 | Aucune notification quand on est mentionné | Le Messaging ne publiait **aucun événement** (documenté tel quel). | Nouvel événement **`message.mention`** + `MessagingEventPublisher` + queue **`nexawork.notification.mention`** + consumer. Le lien ouvre le canal / la conversation d'origine. ⚠️ Le **nom de l'auteur n'est pas transmis** : la Gateway ne propage que l'`userId` et aucun service ne résout les noms — on ne l'invente pas, le corps dit « Vous avez été mentionné dans #… ». |
| 20 | Canal privé : **les bénéficiaires n'atteignaient jamais le serveur** | `create()` **et** `setRestriction()` envoyaient tous deux `memberUserIds: []`, et `ChannelGrant` ne portait qu'un **nom** (pas d'id). Le picker était en outre **entièrement mock** (5 personnes + 3 équipes en dur). Le modal « Gérer les accès » laissait croire à un partage inexistant, et rouvrait toujours **une liste vide**. | `ChannelGrant` porte un **id réel** ; le picker liste les **membres réels** et les **équipes réelles du projet** ; les bénéficiaires partent vraiment. Une **équipe est déployée en ses membres** (le Messaging ne stocke que des `userId` — il ignore la composition des projets). Le modal **relit** les accès existants (`GET /channels/{id}/access`). |
| 21 | `GET /tasks/{id}` → **500** sur un id non-UUID | `MethodArgumentTypeMismatchException` n'était pas mappée dans `GlobalControllerExceptionHandler` (**commons**) : une erreur d'appelant sortait en **panne serveur** (`Invalid UUID string: 1PT-1`). | Mappée en **400**. ⚠️ La classe étant partagée, le mapping n'est effectif que dans les services **reconstruits** (`project-service`, `messaging`, `notification` ici) ; les autres l'auront à leur prochain build. |

### Lot du 2026-07-14 — JaaS, email invité, temps réel, nom de l'auteur — ✅ **déployé** (vérifié dans les jars, **non retesté en navigateur**)
Commits `8ceaae5`, `139aecb`, `4f6de6f`.
**Images reconstruites** : `api-gateway`, `meeting-service`, `messaging-service`, `notification-service`, `frontend`.
⚠️ **`api-gateway` faisait partie du lot** (il pose `X-User-Name`) — il manquait à la liste de rebuild annoncée dans le handoff.
Aucune migration.

**Vérification bytecode (piège n°1) — faite le 2026-07-14, tout vert :**
- `meeting/security/GatewayIdentityFilter.class` → `X-User-Name` présent ✅
- `meeting/services/JitsiTokenService.class` → `.audience().single(…)` présent ✅
- `messaging/security/GatewayIdentityFilter.class` → `X-User-Name` présent ✅
- `gateway/security/JwtAuthenticationFilter.class` → `X-User-Name` présent ✅

| # | Symptôme | Cause racine | Correctif |
| :-: | :- | :- | :- |
| 22 | Jitsi refuse le jeton : **« Invalid 'aud' value. It should be 'jitsi' »** | JJWT sérialise `.audience().add("jitsi")` en **tableau** `["jitsi"]`, or JaaS exige la **chaîne** `"jitsi"`. | `.audience().single("jitsi")` (`JitsiTokenService`). |
| 23 | **L'email d'invité externe n'arrivait jamais** (le lien était pourtant bien généré) | `config-repo/nexawork-notification.yml` n'avait **pas** le `mail.smtp.ssl.trust` que `nexawork-auth.yml` possède → le **proxy TLS intercepteur** faisait échouer le handshake (« Could not convert socket to TLS »). Même cause racine que les emails Auth (I1d). | `mail.smtp.ssl.trust: ${SMTP_SSL_TRUST:*}` ajouté. ⚠️ **À retirer en prod** (sans proxy). |
| 24 | **L'appel restait `ACTIVE` indéfiniment** → 409 sur toute création suivante | `leave()` ne faisait que marquer le départ du participant : **plus personne dans la salle n'y clôturait l'appel**. | `leave()` **clôt** l'appel quand plus aucun participant n'est présent (`end()` partage le même code). |
| 25 | Clic sur la bannière « Appel en cours » **sans effet** | `window.open` échoue **en silence** quand le popup est bloqué. | Détection du retour `null` → **toast** invitant à autoriser les popups. |
| 26 | **Nom de l'auteur jamais affiché** (notifications, `caller.displayName()` retombait sur « Utilisateur ») | Le JWT porte bien `displayName`, mais la **Gateway ne le propageait à aucun service** — d'où le ⚠️ du point #19 (« on ne l'invente pas »). | En-tête **`X-User-Name`** posé par la Gateway (**URL-encodé** : un en-tête HTTP n'est pas sûr en UTF-8 — « Moussa Bâ » arriverait mutilé) + lu par les **6 `GatewayIdentityFilter`**. |
| 27 | `There is no underlying STOMP connection` | `publish()` émettait alors que la connexion s'établit de façon **asynchrone**. | Les trames émises trop tôt sont **mises en attente** et rejouées à `onConnect`. |
| 28 | **🔑 Vraie cause du « pas de temps réel »** : le fil devenait muet jusqu'au rechargement de la page | `subscribeIfPossible()` refusait de réabonner une destination déjà présente dans `subs`. Or **les abonnements meurent avec la socket** : après une coupure ils n'étaient **jamais** réarmés. | `subs` est **vidée à `onWebSocketClose`** → réabonnement effectif à la reconnexion. |
| 29 | Présence : passage « hors ligne » avec jusqu'à 20 s de retard | Seul un **sondage de 20 s** alimentait la présence. | Le Notification Service **diffuse** connexions/déconnexions sur **`/topic/presence`** ; le sondage ne sert plus que de **rattrapage**. |
| 30 | Notification de mention : ni auteur, ni ancrage sur le message | Cf. #26 (nom absent) ; le lien ouvrait le canal **sans y défiler**. | La notification porte le **nom de l'auteur** et un lien **ancré** (`?message=<uuid>`) : la vue ouvre le canal/la conversation, **y défile** et **encadre** le message. |

### Lot du 2026-07-14 (matin) — cycle de vie des appels, JaaS, appel entrant
**Rebuild requis : `meeting-service`, `notification-service`, `frontend`.**
⚠️ **`nexawork-config-repo/nexawork-meeting.yml` a changé** (bloc `nexawork.meeting`) → **recréer `config-server`
puis `meeting-service`** (le config-repo est monté en volume, mais le serveur de config doit le relire).
Aucune migration. Builds Angular dev + prod verts, `mvn compile` vert.

| # | Symptôme | Cause racine (**mesurée**) | Correctif |
| :-: | :- | :- | :- |
| 31 | « Supprimer définitivement l'historique » : **tout réapparaît au rechargement** | `historique.component.ts` **ne parlait jamais au backend**. `hide()` et `remove()` poussaient l'id dans un **signal local** (`this.removed.update(…)`) et affichaient un toast affirmant « supprimée définitivement ». `MeetingsHttpService.hide()`/`remove()` existaient et étaient corrects — **jamais appelés**. Le masquage était atteint du même mal. | Les deux appellent le serveur. Le masquage local n'est appliqué **qu'après** confirmation : sinon la ligne disparaîtrait de l'écran d'un utilisateur à qui **REF B** vient de refuser la suppression (403). |
| 32 | Un appel lancé **reste « en cours » indéfiniment** (mesuré : **~4 h**, `00:16` → `04:12`) | `leave()` ne clôt l'appel que lorsqu'un participant **entré** en repart. Si l'hôte crée l'appel et **n'entre jamais** dans la salle — exactement ce que provoquait le rejet JaaS (#33) — **personne ne déclenche jamais la clôture**. L'appel reste `ACTIVE` à vie : bannière perpétuelle, et **REF A** refusant toute réunion suivante. | **`CallSweeper`** (`@Scheduled`, 5 min) : clôt tout appel `ACTIVE` dont la **salle est vide** depuis > **15 min** (compté depuis le départ du dernier présent, ou depuis le début si personne n'est jamais entré), et **plafond dur de 12 h**. Paramétré dans le config-repo. Le balayage tourne **hors requête HTTP** → il ne touche jamais `CallerContext` (l'identité vit dans le SecurityContext du thread de la requête). Une exception y est rattrapée : non rattrapée, elle **annulerait les exécutions suivantes** de la tâche. |
| 33 | **« Authentication failed. Sorry, you're not allowed to join this call. »** | **Ce n'est pas un bug de notre code.** Jeton réellement généré puis décodé : `iss=chat`, `sub`=AppID, `aud="jitsi"` (chaîne), `room`, `kid`, RS256, `moderator`, `lobby_bypass` — **conforme à la spécification JaaS**. Clé privée = RSA 2048 **valide**. URL du tenant = `https://8x8.vc`. Dérive d'horloge = **1 s** (elle aurait pu faire rejeter `nbf`). ⇒ **8x8 refuse une signature pourtant correcte** : la **clé publique enregistrée dans la console JaaS ne correspond pas** à la clé privée qui signe. | **Action côté console 8x8** (hors code). Empreinte SHA-256 de la clé publique dérivée du `.env` : `3d1604bc2968dc2cac4eb3080c1be0368a016c4e067850d60a37423461999858`. **Instrumentation ajoutée** : `errorOccurred` de l'IFrame API est désormais écouté — les erreurs JaaS restaient **enfermées dans l'iframe**, sans jamais remonter à NexaWork. |
| 34 | L'utilisateur doit **ressaisir son nom** (« Join Meeting ») alors qu'il est déjà authentifié | Deux causes cumulées : `openJitsiRoom` était appelé **sans `displayName`** (`userInfo` absent), et `prejoinPageEnabled` est une option **DÉPRÉCIÉE**, ignorée par Jitsi — l'écran de pré-connexion s'affichait donc quoi qu'il arrive. | `prejoinConfig: { enabled: false }` (option courante ; l'ancien nom est conservé pour un tenant plus ancien) + `userInfo: { displayName, email }` issus de la session. |
| 35 | Un membre convié pouvait tomber en **salle d'attente** | `lobbyBypass` valait `isHost || invitedExplicitly` : un membre authentifié **non convié explicitement** qui rejoignait devait être admis manuellement. | Tout membre **authentifié** entre directement (il s'est déjà authentifié sur la plateforme, et l'appel n'est de toute façon visible que de son hôte et de ses conviés — cf. `activeCalls()`). **L'invité externe reste en salle d'attente** (décision utilisateur, conforme V5.1 §14.5) : il n'a pas de compte, et un lien qui fuite ne doit pas ouvrir la salle. |
| 36 | Le modérateur ne peut pas **mettre fin à l'appel pour tous** | Le bouton « raccrocher » de JaaS ne fait que **quitter** la salle. Aucun bouton NexaWork n'exposait `POST /calls/{id}/end` (l'endpoint existait, avec son contrôle hôte/admin). | Bouton **combiné rouge « Terminer pour tous »** dans la salle, **visible du seul créateur** (`room.hostUserId === session.user().id` — `hostUserId` ajouté à `CallRoom`). Deux gestes : `endConference` (chasse les participants de la salle JaaS) **et** `end` côté serveur, qui **fait foi** — le serveur est appelé même si la commande JaaS échoue. Icône `phoneOff` ajoutée au jeu d'icônes. |
| 37 | L'invité ne voit qu'une **notification** et un bouton « Appel en cours » | Rien ne surgissait à l'écran : il fallait repérer la pastille du header. | **Modal d'appel entrant** (façon Teams / WhatsApp) monté au niveau du **shell** : `IncomingCallService` se greffe sur la file STOMP personnelle — l'invitation `MEETING_INVITED` y est **déjà poussée en temps réel**, aucun sondage n'est ajouté. **Décliner ne met pas fin à l'appel** : il ferme le modal seul, et la bannière « Appel en cours » reste disponible pour rejoindre plus tard. Les appels déclinés sont mémorisés — sans quoi la notification **rejouée à la reconnexion STOMP** ferait resurgir un modal tout juste écarté. Le payload backend porte désormais `topic` et `actorName` (le modal n'a donc pas à analyser le corps du message, qui est du texte d'affichage). |

> ⚠️ **#33 est le nœud du bloc.** Tant que 8x8 refuse le jeton, l'hôte n'entre jamais dans la salle — ce qui
> **alimentait directement #32** (appel jamais clos). Les correctifs #34/#35/#36/#37 ne seront réellement
> exerçables qu'une fois la clé publique corrigée dans la console JaaS.

#### Rotation de la clé JaaS — 2026-07-14 (en attente de test navigateur)
L'ancienne clé (`kid …/c66d9e`, créée le 17/06) était **enregistrée sous la bonne app** — le `kid` correspondait.
Ce qui n'a **jamais pu être prouvé**, c'est que la clé **publique stockée par 8x8** derrière ce `kid` soit la
jumelle de la clé **privée** du `.env` : la console n'affiche pas la clé publique, et 8x8 n'expose aucun endpoint
public pour la lire (`api.jaas.8x8.vc` **n'existe pas** — vérifié : l'hôte ne résout pas, alors que `8x8.vc`
répond 200 ; la connectivité sortante n'est donc pas en cause).

**Méthode retenue** — au lieu de laisser JaaS générer la paire (auquel cas la correspondance reste invérifiable) :
1. paire RSA 2048 générée **localement**, dans `.secrets/` (**hors dépôt**) ;
2. **clé publique téléversée** dans la console → nouveau `kid` **`…/228bdd`** ;
3. clé privée injectée dans `.env` en **base64 pur, sans en-têtes ni sauts de ligne** —
   `JitsiTokenService.loadPrivateKey()` retire de toute façon les en-têtes **et tous les espaces** avant de
   décoder. Ce format **supprime tout échappement** : ni `sed`, ni `perl`, ni `awk` de ce poste ne parvenaient à
   produire des `\n` littéraux fiables dans un `.env` (le shell les convertissait en vrais sauts de ligne, et la
   valeur se retrouvait tronquée à 44 caractères — silencieusement).
4. **Correspondance prouvée** : l'empreinte SHA-256 de la clé publique dérivée du `.env` est identique à celle du
   fichier téléversé (`a8b90be2678c863d2a73278341dcbbeba11614bb7d5f5a531f7602e355791b2a`).

⚠️ **L'ancienne clé `c66d9e` est conservée dans la console volontairement** : si les réunions échouent *encore*
après cette rotation, c'est que la cause n'était **pas** la clé — information décisive, qu'une suppression
prématurée détruirait.

🔒 **`.gitignore`** : `.env` seul était ignoré → une sauvegarde `.env.backup-*` portant les **mêmes secrets** a
bel et bien été commitée (localement, jamais poussée) avant d'être retirée. Corrigé : **`.env.*`** et
**`.secrets/`** sont désormais ignorés.

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

- **🔴 « Le serveur ne répond pas » — cause racine trouvée et corrigée (2026-07-13).** Le diagnostic
  précédent (« absence de `-Xmx` ») était **incomplet** : borner le tas était nécessaire mais très
  insuffisant. Mesure de la VM Docker (4,9 Go) : `used 3870 Mo, free 95 Mo, **SWAP 1034 Mo**`.
  **Aucun OOM au `dmesg`** — le noyau ne tuait personne, il **swappait**, ce qui est pire :
  1. les JVM se figeaient (Hikari : `Thread starvation or clock leap detected`, housekeeper delta **1 min 17 s**) ;
  2. les clients PostgreSQL coupaient → `Broken pipe` / `connection to client lost` / `exit code 2` ;
  3. le postmaster y voyait un **crash** → `terminating any other active server processes` → récupération ;
  4. la récupération n'aboutissait **jamais** (`syncing data directory` > 50 s, disque saturé par le swap)
     → `last known up` figé sur **3 crashs successifs** → **boucle de crash** → toutes les requêtes échouent.
  - **Cause n°1 (la plus grosse) : Hikari n'était configuré nulle part.** Son défaut est
    `maximum-pool-size=10` **ET `minimum-idle=10`** → chaque service gardait **10 connexions ouvertes en
    permanence**. Or **1 connexion = 1 processus PostgreSQL (~7 Mo)** : 9 services = **90 processus (~630 Mo)**
    maintenus **même application au repos**, pour un `max_connections` de 100. → `application.yml` (partagé) :
    pool **5 max / 1 idle** + recyclage. **Vérifié après reset : 8 connexions** (était ~90).
  - **Cause n°2 : `-Xmx` ne borne que le tas.** Le metaspace, les piles de threads, le code JIT et les buffers
    directs s'y ajoutent (`project-service` **mesuré à 458 Mo** pour `Xmx=256m`), et **rien ne bornait le
    conteneur**. → `Xmx` 256→192m, metaspace 192→160m, `-Xss512k`, **JIT C1 seul** (`-XX:TieredStopAtLevel=1` :
    ~2× moins de CPU — décisif sur une machine 2 cœurs qui porte 9 services), `+ExitOnOutOfMemoryError`.
  - **`mem_limit` sur les 13 conteneurs** (garde-fous, pas des rations : plafond 448m pour ~300m réels),
    **768m garantis à PostgreSQL** (il ne doit plus jamais être la victime), **`restart: unless-stopped`**
    (une panne se répare seule au lieu de rester à terre).
  - **Résultat mesuré** : `used` **3870 → 2537 Mo**, `swap` **1034 → 121 Mo**, `available` **794 → 2130 Mo**.
  - ⚠️ **`RABBITMQ_VM_MEMORY_HIGH_WATERMARK` est DÉPRÉCIÉE** — sa seule présence fait **refuser le démarrage**
    de l'image `rabbitmq:3-management`. Inutile : RabbitMQ lit la limite du cgroup, `mem_limit` suffit.
  - ⚠️ **Démarrage à froid lent** : 9 JVM qui bootent ensemble sur 2 cœurs **dépassent la période de grâce
    de 5 min** des healthchecks → les services passent par un état `unhealthy` **transitoire**. Ce n'est pas
    une panne : attendre. Compter **~30 min** pour une stack complète repartie de zéro.
  - ⚠️ **Zombie au `docker compose down`** : les conteneurs créés **avant** l'ajout de `init: true` peuvent
    refuser de s'arrêter (`PID ... is zombie and can not be killed`). → `docker rm -f <conteneur>`.

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
