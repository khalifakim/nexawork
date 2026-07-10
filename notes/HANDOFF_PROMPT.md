# NexaWork — Reprise du travail (prompt pour une nouvelle instance Claude Code)

> Copie-colle ce fichier entier comme premier message à une nouvelle instance. Il est autosuffisant :
> l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.
>
> **Dernière mise à jour : 2026-07-10** (clôture de la phase I1).

---

## 🎯 Mission

Tu reprends le développement de **NexaWork** (plateforme collaborative de gestion de projets — sujet de mémoire).

- **Backend** : 9 microservices Spring Boot 3.5 / Java 21. **Baseline livrée** (phases 0-10).
- **Frontend** : Angular 20, **entièrement construit** mais initialement sur données **mockées**.
- **Phase actuelle** : **intégration Frontend ↔ Backend** — remplacer les mocks par de vrais appels HTTP,
  **phase par phase**, selon un plan qui fait autorité.

⚠️ **Nuance importante** : « backend livré » vaut pour la **baseline**, pas pour tout le plan. **Trois phases
restantes exigent du développement backend neuf** : **I9** (endpoints de recherche), **I10** (génération PDF),
**M2** (persistance du chat de réunion) — et **M3** partiellement (claim `lobby_bypass`).

**Réponds toujours en français.**

## 📖 Première action OBLIGATOIRE — lis ces fichiers dans l'ordre

1. **`nexawork/notes/IMPLEMENTATION_STATUS.md`** — le suivi d'avancement. **Ton point d'entrée.**
   Il contient l'état réel du code, les pièges d'environnement et les décisions actées.
2. **`docs-config/memoire/notes/PLAN_INTEGRATION_FRONTEND_BACKEND.md`** — le **plan faisant autorité** :
   pour chaque phase, les endpoints exacts, DTO, signatures, mapping champ par champ, composants à recâbler, tests.
3. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel V5.1
   (**source de vérité** de l'app). À maintenir aligné à 100 % avec le réel.
4. Vérifie l'état réel : `git status` + `git log --oneline -5` ; `docker compose ps`.

---

## 📍 Où on en est (2026-07-10)

**Progression : 2 / 14 phases du périmètre livrable.** (14 = 16 phases initiales − M5/M6 passées en perspective.)

- **I0 · Socle transverse** — ✅ livré. Enveloppe `Response<T>` + `unwrap()`, context-paths
  (`core/http/api.config.ts`), `base-http.service.ts`, UUID partout, intercepteurs `jwt`/`error`
  (refresh 401 + timeout 20 s), drapeaux `environment.mock` par domaine.
- **I1 · Auth & Workspace** — ✅ **clôturé et validé en navigateur**. Login/register/reset, token org-scopé
  (`refresh(workspaceId)`), workspaces (CRUD, switch, quitter), membres, invitations (dont **compte existant**),
  profil, sécurité, changement d'email avec invalidation des sessions. `environment.mock.auth = false`.

### 🔎 État réel du code (vérifié)
- **Seulement 2 `*HttpService` existent** : `AuthHttpService`, `WorkspaceHttpService`.
  Les **10 autres domaines** (projets, tâches, membres, canaux, conversations, GED, notifications, accueil,
  réunions, recherche) sont liés **en dur** à leurs `*MockService` dans `core/services/data.providers.ts`.
- **Client STOMP : non écrit.** `@stomp/stompjs` + `sockjs-client` sont installés, aucun service WebSocket.
- **Absents du backend** : endpoints `/search` (I9), génération PDF/OpenPDF (I10), entités
  `MeetingMessage`/`MeetingFile` (les tables existent, vides).

### ✅ Git — état propre
`HEAD` = `backend/dev` = `main` = `origin/backend/dev` = `origin/main` = **`36606e9`**. Arbre de travail propre.

---

## 🚀 TÂCHE IMMÉDIATE — Phase **I2 · Projects + Tasks / Kanban**

**La phase la plus lourde du plan.** Le backend (Project Service, FSM Kanban, `taskKey` `PREFIX-NNN`) est
**déjà prêt** : il n'y a que du **frontend** à écrire.

**À faire** :
1. Créer `ProjectsHttpService` et `TasksHttpService` (`extends BaseHttpService`).
2. **Étendre les contrats abstraits** — c'est le gros du travail : aujourd'hui `projects.service.ts` et
   `tasks.service.ts` sont en **lecture seule**. Créations/éditions (drag-drop Kanban, création de tâche,
   sous-tâches, commentaires, pièces jointes) ne font que **muter des signals locaux** dans les composants.
3. Recâbler : `kanban` (drag-drop → `PATCH /tasks/{id}/status`, gérer le **422** de la FSM par un toast),
   `creer-tache`, `fiche-tache`, `creer-projet`, `projets-archives`, `accueil/mes-taches`, `gantt`.
4. Binder dans `data.providers.ts` puis passer `environment.mock.projects` et `.tasks` à `false`.
5. Tester dans le navigateur, mettre à jour V5.1 si divergence, puis `IMPLEMENTATION_STATUS.md`.

**Détails à trancher pendant I2** (voir plan §5) :
- `progress` / `docs` / `folders` d'un projet : **dériver** (tâches done/total ; comptes GED) ou enrichir `ProjectResponse` ?
- **`taskKey`** : à **ajouter** au modèle `TaskCard` (l'identifiant mono affiché sur les cartes).
- Les routes `projets/:id` utilisent aujourd'hui un **slug** ; le backend renvoie un **UUID** → adapter.

> **Le plan `PLAN_INTEGRATION_FRONTEND_BACKEND.md` § Phase I2 contient le contrat backend exact, les signatures
> à ajouter et le mapping champ par champ. Lis-le avant de proposer quoi que ce soit.**

---

## 🖥️ SETUP D'EXÉCUTION — particularités CRITIQUES de cette machine (8 Go RAM)

1. **Ne lance QUE les services de la phase en cours.** Pour I2 :
   `config-server`, `postgres`, `rabbitmq`, `auth-service`, `project-service`, `api-gateway`, `frontend`.
   ⚠️ `api-gateway` a un `depends_on` sur les 8 microservices → **toujours** `--no-deps` :
   `docker compose up -d --no-deps api-gateway`.

2. **🔴 springdoc / Swagger — le piège n°1.** `SPRINGDOC_ENABLED` est **désactivé par défaut**. Son init a été
   **mesurée à 81 s** et sature le CPU → dépasse le **timeout de 20 s** du frontend → toasts
   « Le serveur ne répond pas » **intermittents**, famine de threads Hikari, connexions PostgreSQL perdues.
   **Ne l'active jamais pendant les tests.** Ponctuellement :
   `SPRINGDOC_ENABLED=true docker compose up -d --no-deps --force-recreate auth-service`, puis
   `http://localhost:4200/nexawork-auth-api-v1/swagger-ui/index.html`. Remettre à `false` après.

3. **🔴 JAMAIS `docker compose build --no-cache frontend`.** Cela force `npm install` à retélécharger depuis
   `registry.npmjs.org` → le **proxy TLS** fait échouer le build. Un build **normal** suffit : `npm install` reste
   en cache et seules les couches `COPY . .` + `npm run build` re-tournent.
   **Une date d'image inchangée après un build = le code était déjà à jour**, ce n'est pas une anomalie.

4. **Ports Java hôtes gelés** : Docker Desktop (Windows/WSL2) fige le port-forwarding de `:8080` et `:8081`
   (timeout depuis l'hôte alors que les services répondent en interne).
   → **On teste toujours via http://localhost:4200** : le conteneur **frontend (nginx)** sert l'app **et**
   proxifie `/nexawork-*` et `/ws/*` vers `api-gateway:8080` en interne (`nexawork-frontend/nginx.conf`).
   `ng serve` en local NE marche PAS (il aurait besoin du `:8080` hôte).

5. **Tester en ligne de commande** = conteneur curl sur le réseau interne, jamais `localhost:8080` :
   `docker run --rm --network nexawork_default curlimages/curl:latest -s http://api-gateway:8080/...`
   On peut forger `X-User-Id`/`X-Org-Id`/`X-Org-Role` (le `GatewayIdentityFilter` leur fait confiance) pour
   tester les 403/200 des règles RBAC.

6. **Workflow rebuild/redeploy** (⚠️ **l'utilisateur lance lui-même ces commandes**) :
   `docker compose build <service>` → vérifier la date de l'image (`docker images <img> --format "{{.CreatedAt}}"`,
   **une seule image à la fois** — la commande refuse deux arguments) →
   `docker compose up -d --no-deps --force-recreate <service>`. **Toujours `--force-recreate`** après un build.

7. **`config-server` brûle ~120 % de CPU** en continu, mais n'est lu qu'**au démarrage** des services.
   Une fois tous `healthy` : `docker compose stop config-server` libère un cœur. Le redémarrer avant tout
   `up`/`--force-recreate` d'un service backend. *(Il sert les fichiers de `config-repo` directement : un
   changement dans `config-repo/*.yml` est pris au redémarrage du service concerné, sans rebuild.)*

8. **Réseau à proxy TLS intercepteur** (école/entreprise) — casse tout TLS sortant :
   - **SMTP** : réglé par `mail.smtp.ssl.trust: ${SMTP_SSL_TRUST:*}` (`config-repo/nexawork-auth.yml`) → les emails
     partent réellement. Reste **intermittent** : un envoi peut échouer (`SSLHandshakeException`) puis réussir
     juste après. Les envois sont `@Async` → un échec SMTP **ne bloque jamais** la requête HTTP.
   - **Maven hôte** : `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` + `JAVA_HOME=C:\Program Files\Java\jdk-21`.
     Le build **Docker** n'est pas affecté.
   - **Git** : `git config --global http.sslBackend schannel` (déjà fait). **Jamais** `http.sslVerify false`.

9. **PostgreSQL** : conteneur `nexawork-postgres`, user `postgres`, 7 bases `nexawork_*_db`.
   Repartir de zéro sur l'auth :
   `docker exec nexawork-postgres psql -U postgres -d nexawork_auth_db -c "TRUNCATE users, organisations, organisation_members, invitations, refresh_tokens, user_action_tokens, audit_trail CASCADE;"`

10. **1ʳᵉ invitation lente (~10 s)** : la connexion RabbitMQ est créée paresseusement au premier `publish` (6 s).
    Normal, sous le timeout. Les suivantes sont instantanées.

11. **Édition de `.sh`** : Edit/Write réécrit en **CRLF** sur ce poste → casse les scripts en conteneur Linux
    (`$'\r'`). Repasser en LF (`sed -i 's/\r$//'`) après édition.

---

## 🔒 Règles NON NÉGOCIABLES

1. **Git : ne commite JAMAIS.** L'utilisateur gère tout Git. Tu **proposes** les blocs de commit
   (Bloc A = `nexawork`, Bloc B = `docs-config`). **Aucun trailer `Co-Authored-By`.**
2. **⚠️ Ne PAS faire `git checkout main` depuis `backend/dev`.** Les deux branches diffèrent de milliers de
   fichiers ; un verrou Windows sur `.git/HEAD` a déjà **interrompu un checkout en plein milieu** (HEAD resté sur
   `backend/dev`, arbre passé sur `main` → faux diff géant). Récupération : `git reset --hard HEAD`.
   Pour merger sans toucher un fichier :
   `git push origin backend/dev:main` → `git fetch origin --prune` → `git branch -f main origin/main`.
3. **Ne change pas le design ni les workflows du frontend.** Tu remplaces les données mockées par de vrais appels
   HTTP, tu étends les contrats (`abstract *Service`) et recâbles les handlers. Rien de visuel.
4. **Bascule par domaine** : chaque phase livrée → drapeau `environment.mock.X` à `false` (+ binding HTTP dans
   `core/services/data.providers.ts`) et **test dans le navigateur**. Pas de flip global en fin de projet.
5. **V5.1 est la source de vérité** : toute divergence/évolution → corriger `nexawork-reference-v5.md`
   **immédiatement**. *(Le référentiel a déjà sur-affirmé plusieurs fois : vérifie toujours dans le code avant
   d'affirmer qu'une chose est implémentée.)*
6. **`IMPLEMENTATION_STATUS.md` à jour à la fin de chaque étape.**
7. **Proposer la liste des fichiers AVANT de coder**, et attendre le feu vert de l'utilisateur.
8. **Aucune fonctionnalité simulée dans le livrable final** : ce qui est **annoncé comme livré** au mémoire doit
   fonctionner. Une fonctionnalité **présentée en perspective** (M5, M6, port `VideoConferencePort`) ne viole pas
   cette règle.

---

## 🗺️ Ce qui reste — 12 phases

| Ordre | Phase | Backend | Charge |
| :-: | :- | :-: | :- |
| **I2** | Projects + Tasks/Kanban | ✅ prêt | **La plus lourde** — 2 HttpServices + recâblage des écritures |
| I3 | Members | ✅ prêt | Légère — annuaire + présence Redis (`/presence/active`) |
| I4 | Channels + Conversations | ✅ prêt | Lourde — 2 HttpServices + **client STOMP à écrire** |
| I5 | GED / Documents | ✅ prêt | Lourde — 1 HttpService (~13 méthodes) + File Service. Inclut la **photo de profil** (reste de I1) |
| I6 | Notifications | ✅ prêt | Moyenne — STOMP + **Service Worker Web Push** |
| I7 | Accueil / Dashboard | ✅ prêt | Légère — agrège I2/I4 ; retirer `membersOnline` ; trancher `myTasks()` |
| I9 | Recherche globale | 🔴 **à développer** | Endpoints `search` ILIKE par service + agrégation Gateway (respecter REF F/G) |
| I10 | Rapports PDF | 🔴 **à développer** | OpenPDF + `/projects/{id}/report` et `/workspaces/{id}/report` |
| I8 | Meetings — socle | ✅ (M1) | Ajouter `jitsiUrl`/`jwt` au modèle |
| M4 | IFrame API JaaS | n/a | Embed + events |
| M2 | **Chat de réunion persistant (F5)** | 🔴 **à développer** | Entité `MeetingMessage` + repo + 2 endpoints |
| M3 | Lobby (approbation) | 🔴 partiel | Claim `lobby_bypass` dans `JitsiTokenService` |

**🔮 Hors périmètre (perspectives)** : **M5** partage de fichiers en réunion · **M6** enregistrement
(bloqué par le tier JaaS gratuit : `features.recording=false`). Documentés comme tels dans V5.1 §4.6/§14.4.

---

## 🚦 Démarrage

1. Lis les 3 fichiers de référence ci-dessus.
2. `git status` (doit être propre sur `backend/dev`) et `docker compose ps`.
3. Lis la **§ Phase I2** du plan.
4. **Propose la liste des fichiers** pour I2 et attends le feu vert.

Si Docker Desktop est éteint, demande à l'utilisateur de le relancer. S'il voit des toasts
« Le serveur ne répond pas », vérifie **d'abord** que `SPRINGDOC_ENABLED` n'a pas été activé.
