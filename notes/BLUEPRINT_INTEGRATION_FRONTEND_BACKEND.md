# Blueprint d'intégration Frontend ↔ Backend (mock → HTTP)

> Feuille de route pour brancher le frontend Angular 20 (aujourd'hui sur mocks) au backend
> Spring Boot déjà livré. Issu de l'audit frontend↔backend (2026-07-06). Le frontend reste la
> **source de vérité comportementale** ; ce document liste ce qu'il faut ajouter/mapper côté
> frontend pour consommer les endpoints réels, sans changer l'UX.

## 0 · Résumé exécutif

Le swap `provideDataServices()` (mock → HTTP) **n'est pas** « un seul fichier ». Trois chantiers :

1. **Prérequis transverses** (§1) : dé-wrapper l'enveloppe `Response<T>`, construire les URLs par
   context-path, gérer UUID (string) au lieu de `number`, aligner les URLs WebSocket, pagination.
2. **Couche de mapping DTO ↔ view-model** (§2) : les modèles frontend sont **façonnés pour
   l'affichage** (tuples `[label,color,bg]`, buckets `'retard'`, couleurs d'avatars, tailles `"2,4 Mo"`),
   très différents des DTO backend. Chaque `*HttpService` doit traduire.
3. **Méthodes d'écriture manquantes** (§2) : 8 des 10 services abstraits sont **lecture seule** ;
   les créations/éditions se font aujourd'hui en **état local de composant** (`@Output`, mutations de
   signals). Il faut étendre les contrats abstraits **et** recâbler les composants d'écriture.

Ordre recommandé en §3.

---

## 1 · Prérequis transverses (à faire une fois)

| # | Sujet | État frontend | Action |
| :- | :- | :- | :- |
| T1 | **Enveloppe `Response<T>`** `{status, payload, metadata, message}` | Modèles non enveloppés | `map(r => r.payload)` dans chaque HttpService (ou un interceptor de dé-wrapping global). |
| T2 | **URLs par context-path** | `apiUrl='http://localhost:8080'` seul | Construire `${apiUrl}/nexawork-{service}-api-v1/api/v1/...`. Prévoir une constante de context-path par service. |
| T3 | **Identifiants `number` → UUID string** | `UserProfile.id:number`, `organisationId:number`, `AuthResponse.userId:number` | Passer en `string` (UUID). Toucher `auth.models.ts` + store auth + tout usage `id:number`. |
| T4 | **Register `displayName` → `firstName`/`lastName`** | `RegisterRequest{displayName}` | Backend attend `firstName`+`lastName`. Adapter le DTO + le formulaire d'inscription (déjà 2 champs à l'écran). |
| T5 | **AuthResponse imbriqué** | Frontend attend `{userId,displayName,orgRole,...}` à plat | Backend renvoie `payload:{accessToken,refreshToken,user:{id,email,firstName,lastName,displayName,...}}` (pas d'org dans login ; org via `refresh` avec `workspaceId`). Mapper + gérer le flux « login → refresh(workspaceId) » pour obtenir le token org-scopé. |
| T6 | **WebSocket URLs** | `:8083/ws/messaging`, `:8085/ws/notifications` (direct, sans context-path) | Router via gateway `Path=/ws/messaging/**` (cf. doc §7.5). |
| T7 | **Pagination `PageInfo`** `{size,totalElements,totalPages,number}` | Non gérée (listes plates) | Pour messages/notifications (curseur/page) : consommer `metadata`. |
| T8 | **JWT interceptor** | `jwt.interceptor.ts` présent ✅ | Vérifier qu'il pose `Authorization: Bearer` + gère le refresh sur 401 (avec `error.interceptor.ts`). |
| T9 | **Auth hors `provideDataServices`** | `auth.service.ts` + `store/auth` (NgRx) séparés | Brancher `auth.service` sur Auth Service directement (login/register/refresh/logout/reset). |

---

## 2 · Blueprint par domaine

Légende : **R** = lecture (existe), **W+** = écriture à ajouter au contrat abstrait, **MAP** = mapping DTO↔VM requis.

### 2.1 · Auth / Session  *(hors provideDataServices — `auth.service.ts`, `session.service.ts`, `store/auth`)*
- **Backend** : `/nexawork-auth-api-v1/api/v1/auth/{register,login,refresh,logout,password/*,verify-email}`, `/users/me*`, `/workspaces*`, `/workspace-members*`, `/invitations*`.
- **MAP** : T3/T4/T5 (UUID, firstName/lastName, enveloppe imbriquée + flux refresh workspaceId).
- **W+** : profil (`PATCH /users/me/profile` multipart photo), email, password, création/switch workspace, invitations, gestion membres.
- **Composants** : onboarding (login/register/reset), `parametres/{profil,securite,general,membres,invitations,espaces}`, menu workspace.

### 2.2 · Projects  *(`projects.service.ts`)*
- **R** : `list()`, `byId(id)` → `GET /projects`, `GET /projects/{id}`.
- **Backend** : Project Service `/projects*`, `/archived-projects`, `/projects/{id}/{overview,report,members,teams,statuses,transitions,workflow,tasks}`.
- **MAP** : `Project{id(slug),name,color,progress,docs?,folders?}` ↔ `ProjectResponse{id(UUID),name,prefix,description,organisationId,ownerUserId,status,startDate,endDate,enforceWorkflowOrder,memberCount,createdDate}`.
  - ⚠️ `id` frontend = **slug** ; backend = **UUID** (les projets n'ont pas de slug). → utiliser l'UUID comme identifiant de route.
  - `progress`, `docs`, `folders` = **calculés/non fournis** par le backend → dériver (progress = tâches done/total ; docs/folders = comptes GED) ou étendre l'API.
  - `prefix`, `status`, dates, `ownerUserId` **absents du modèle frontend** → à ajouter (utile Kanban, archivage, en-tête projet).
- **W+** : create, update (PATCH), archive, restore, delete → aujourd'hui via `creer-projet` (`@Output`) et menu paramètres.
- **Composants** : `projets/*`, `creer-projet`, `projets-archives`.

### 2.3 · Tasks / Kanban  *(`tasks.service.ts`)*
- **R** : `columns()`, `board()`, `cardById(id)` → `GET /projects/{id}/statuses`, `GET /projects/{id}/tasks`.
- **MAP (lourd)** : `TaskCard{id,title,desc,prio:[label,color,bg],tag:[label,color],prog:[%,color],team:string[](couleurs),links,comments,due:'retard'|'semaine'|'mois'}` ↔ `TaskResponse{id,projectId,taskKey,title,description,statusId,statusName,priority(enum),assigneeType,assigneeId,startDate,dueDate,estimate,subtaskCount,commentCount,attachmentCount,createdDate}`.
  - `prio` tuple ← `priority` enum (table label/couleur côté FE) ; `prog` ← dérivé (sous-tâches) ; `team` ← `assigneeId`+avatar ; `due` bucket ← calcul depuis `dueDate` ; `links`←`attachmentCount`, `comments`←`commentCount`.
  - ⚠️ `taskKey` (nouvellement livré backend) **absent de `TaskCard`** → à ajouter (l'« identifiant mono » affiché sur les cartes).
  - `KanbanColumn.cat` (`notstarted|active|done|closed`) ↔ `StatusCategory` (NOT_STARTED/ACTIVE/DONE/CLOSED).
- **W+ (tout)** : createTask, updateTask, deleteTask, **changeStatus** (drag-drop → `PATCH /tasks/{id}/status`, gère 422 FSM), sous-tâches (`/tasks/{id}/subtasks`), commentaires (`/tasks/{id}/comments`), pièces jointes (`/tasks/{id}/attachments` via File Service `context=task-attachment`).
  - Aujourd'hui **100 % local** : `creer-tache`→`created.emit`, `fiche-tache`→signals locaux. Gros recâblage.
- **Composants** : `kanban`, `creer-tache`, `fiche-tache`, `gantt`, `accueil/mes-taches` (cocher→Validé).

### 2.4 · Members  *(`members.service.ts`)*
- **R** : `directory()`, `online()`, `others()`, `byName(name)`, `bySlug(slug)` → Auth `GET /workspaces/{id}/members` (annuaire) + Messaging `GET /presence/active` (en ligne).
- **MAP** : `Member{name,color,role,email,online,projects[]}` — ⚠️ **pas d'`id`/`userId`** ; lookups par `name`/`slug`. Backend renvoie des membres avec **UUID**. → ajouter `userId` au modèle et migrer les lookups vers l'UUID. `online` ← présence Redis (WS/endpoint), `projects[]` ← Project Service (agrégation).
- **W+** : aucune côté members (mutations membres = domaine Auth/§2.1).
- **Composants** : `equipes/*`, `conversations/actifs-maintenant`, fiche profil, `parametres/membres`.

### 2.5 · GED / Documents  *(`ged.service.ts`)*
- **R** : `folderContent(path:string[], project)` → GED `GET /ged/folders/{id}/content`.
  - ⚠️ frontend navigue par **`path:string[]`** ; backend par **UUID de dossier** → maintenir une résolution breadcrumb→UUID.
- **MAP** : `GedItem{type,name,owner(name),size(string "2,4 Mo"),mod?,by?,system?,added?,task?}` ↔ `GedFolder`/`GedFile` (UUID, `accessMode`, `sourceFileId`, `fileSize:Long`, `folderType`, timestamps). `size` string ← formatage de `fileSize`. `owner` name ← résolution UUID→nom. `system`/`task` ← `folderType=TASK_ATTACHMENTS`.
- **W+ (tout)** : create folder (§11.3), import fichier (§11.4, via File `context=ged` puis `POST /ged/files`), rename, delete/restore (corbeille), versions (`/ged/files/{id}/versions` + restore), grants (`/ged/grants`, `PATCH .../access`), my-documents, shared-with-me, trash.
- **Composants** : `documents/*`, modals `nouveau-dossier`, `importer-fichier`, `_ged-share-options`.

### 2.6 · Channels  *(`channels.service.ts`)*  — **le plus abouti (3 écritures déjà)**
- **R/W** : `list`, `thread(id)`, `create`, `rename`, `remove`, `restrictionOf`, `setRestriction`, `isPrivate`, `isReadonly`, `hasAccess`, `canWriteInReadonly`.
- **Backend** : Messaging `/channels*`, `/channels/{id}/messages`, `/channels/{id}/access` (GET/PUT), WebSocket STOMP.
- **MAP** : `Channel{id(slug),name,scope,kind(bell/hash),project(name),readonly}` ↔ `ChannelResponse{id(UUID),name,icon(HASH/BELL),channelType(GLOBAL_ORG/PROJECT),projectId(UUID),isSystem,readonly,isPrivate}`. `kind`↔`icon`, `scope`↔`channelType`, `project`(name)↔`projectId`(UUID), `id`(slug)↔UUID.
  - `ChannelMessage{author(name),color,time(string),parts(RichPart[]),mine?,files?}` ↔ `MessageResponse{id,senderUserId,content,sentAt,...}` : `parts` = **rendu riche** (mentions→chips) à parser depuis `content` ; `time` ← format de `sentAt` ; `author`/`color` ← résolution expéditeur.
- **Temps réel** : brancher STOMP `/topic/channels/{id}` (envoi via `/app/channels/{id}/send` ou `POST /channels/{id}/messages`).
- **W+ restant** : envoi de message (aujourd'hui composer local), upload pièce jointe.
- **Composants** : `canaux/*`, modals canal.

### 2.7 · Conversations  *(`conversations.service.ts`)*
- **R/W** : `list`, `thread(id)`, `deletedIds` (signal), `deleteForMe(id)`.
- **Backend** : Messaging `/conversations*`, `/conversations/{id}/messages`, `PATCH /messages/{id}/read`, `DELETE /messages/{id}`.
- **MAP** : `Conversation{id(slug 'sarah-diallo'),name,color,initials,msg(preview),unread,time}` ↔ `ConversationResponse{id(UUID),workspaceId,type,participants[]}`. ⚠️ `id` = **slug de personne** ; backend UUID + participants. `unread`←`conversation_participants.is_read`. `ConversationMessage{me,parts,time,day?,read?,files?}` ↔ `MessageResponse{senderUserId,content,sentAt,readAt}` : `me`←(sender==moi), `read`←`readAt`.
- **W+** : envoi message, `markRead` (`PATCH /messages/{id}/read`), ouverture/création par userId.
- **Composants** : `conversations/*`, `nouveau-message`.

### 2.8 · Meetings  *(`meetings.service.ts`)*
- **R** : `history()`, `thread(id)` → Meeting `GET /calls`, `GET /calls/{id}` (+ messages M2).
- **MAP** : `Meeting{id,name,proj(name),date,time,dur,joined}` ↔ `CallResponse{id,topic,roomName,projectId,hostUserId,status,startedAt,endedAt,participants,jitsiUrl,jwt}`. `name`←`topic`, `dur`←durée calculée, `joined`←participation.
  - ⚠️ **`jitsiUrl`/`jwt` absents du modèle frontend** → nécessaires pour lancer/rejoindre (ouvrir l'iframe JaaS). À ajouter au modèle Meeting/à un DTO de lancement.
  - `MeetingThread{docs[],messages[]}` ↔ `meeting_files`/`meeting_messages` → **backend M2 (chat) pas encore livré** (cf. Phase 10 M2 en pause) ; M5 (fichiers) reporté.
- **W+** : create (`POST /calls` + `memberIds`), participants (`/calls/{id}/participants`, Lot M1 ✅), guests (`/calls/{id}/guests`), join/leave/end, hide, delete. Aujourd'hui `lancer`/`creer-reunion` arment `session.startCall` en local.
- **Composants** : `reunions/*`, `creer-reunion`, header (popover appel via `SessionService`/`OngoingCall`).

### 2.9 · Notifications  *(`notifications.service.ts`)*
- **R** : `list()` → Notification `GET /notifications`.
- **MAP** : `Notification{id,actor(name),ac(tint),title,text,date(string),read?,kind('tache'|'message'|'document'|'projet'),target(string)}` ↔ backend `Notification{id,recipientUserId,type(enum 10 valeurs),title,body,targetUrl,read,isHidden,workspaceId,payload,createdAt}`.
  - ⚠️ `kind` frontend = **4 valeurs** vs **10 `NotificationType`** backend → table de correspondance (MEMBER_INVITED, ADDED_TO_PROJECT, TASK_ASSIGNED, LIVRABLE_VALIDATED, MENTION, MESSAGE_RECEIVED, DOCUMENT_SHARED, MEETING_INVITED, CALL_ENDED, EXTERNAL_GUEST_INVITED → tache/message/document/projet/réunion).
  - `text`←`body`, `target`←`targetUrl`+`payload`, `actor` ← non porté par le backend (dans `body`/`payload`).
- **W+** : `markRead` (`PATCH /notifications/{id}/read`), `hide` (`PATCH /notifications/{id}/hide`), abonnement Web Push (`POST/DELETE /push/subscriptions`).
- **Temps réel** : STOMP notifications (`/user/queue/notifications`).
- **Composants** : cloche/panneau (header), toasts.

### 2.10 · Accueil (dashboard, mes tâches, mentions)  *(`accueil.service.ts`)*
- **R** : `myTasks()`, `mentions()`, `dashboard()`.
- **Backend** : `dashboard()`→Project `GET /workspaces/{id}/dashboard` (ADMIN+OWNER, R1) ; `mentions()`→Messaging `GET /mentions` ; `myTasks()`→agrégation tâches (Project — pas d'endpoint dédié « mes tâches aujourd'hui/retard » : à dériver de `/projects/{id}/tasks` filtrés, ou ajouter un endpoint).
- **MAP** : `DashboardKpis{...,members,membersOnline}` ↔ backend `{activeProjects,inProgressTasks,overdueTasks,workspaceMembers}`. ⚠️ **`membersOnline` conservé dans le modèle frontend** alors que le compteur « en ligne » a été **retiré** (doc §5.2/§13.2) → champ à retirer côté frontend (ou laisser à 0). `workspaceMembers` = **null** côté Project (complété via Auth `/members`).
  - `DashboardProj.e('bonne'|'surveiller'|'critique')` ↔ santé calculée backend (`health`).
- **W+** : `report` (PDF) → `GET /projects/{id}/report` & `/workspaces/{id}/report` (génération réelle backend = cible).
- **Composants** : `accueil/{mes-taches,mentions-recues,tableau-de-bord}`.

---

## 3 · Gaps transverses & fonctionnalités non couvertes

| Gap | Impact intégration |
| :- | :- |
| **Recherche globale** (`search.service.all()`) | Backend `GET /search` = **cible non implémentée** (§13.8). Le swap HTTP de la recherche est **bloqué** tant que l'endpoint fédéré n'existe pas. Garder le mock ou implémenter le service de recherche. |
| **Meeting chat/fichiers** (`MeetingThread`) | Backend **M2 (chat) en pause**, **M5 (fichiers) reporté**. `thread()` restera partiel jusqu'à leur livraison. |
| **Dashboard `membersOnline`** | Champ frontend résiduel d'une KPI retirée → nettoyer. |
| **`myTasks()` agrégé** | Pas d'endpoint « mes tâches (aujourd'hui/retard) » dédié → dériver côté frontend ou ajouter au Project Service. |
| **`progress`/`docs`/`folders` projet** | Non fournis par le backend → dériver (tâches, GED) ou étendre l'API. |
| **WS URLs sans context-path** | `environment.ts` à corriger (§7.5). |
| **id `number` → UUID** | Refactor `auth.models.ts` + store + usages. |

---

## 4 · Ordre d'intégration recommandé

1. **Socle transverse** (§1 T1-T9) : enveloppe, URLs/context-paths, UUID, auth (login/refresh/switch workspace), JWT/refresh interceptor, WS URLs. *Débloque tout le reste.*
2. **Auth & Workspace** (§2.1) : entrer dans l'app avec un vrai token org-scopé.
3. **Projects + Tasks/Kanban** (§2.2, §2.3) : cœur métier ; le plus gros recâblage d'écritures + mapping.
4. **Members** (§2.4) : dépend de projects/auth ; alimente équipes, mentions, conversations.
5. **Channels + Conversations + temps réel STOMP** (§2.6, §2.7).
6. **GED** (§2.5) : volumineux (CRUD + versions + grants + File Service).
7. **Notifications + Web Push + STOMP** (§2.9).
8. **Accueil/Dashboard** (§2.10) : agrège les précédents.
9. **Meetings** (§2.8) : create/participants/guests (M1 ✅) ; iframe JaaS (jitsiUrl/jwt) ; chat/fichiers quand M2/M5 livrés.
10. **Recherche** (§3) : quand l'endpoint fédéré existe.

Chaque domaine = un `*HttpService` + (si besoin) extension du contrat abstrait + mapping + recâblage
des composants d'écriture. Basculer `environment.useMock=false` domaine par domaine (via binding
sélectif dans `provideDataServices`) permet une migration progressive.
