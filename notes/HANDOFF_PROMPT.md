# NexaWork — Reprise de session (phase de correction post-tests)

> **Copie-colle ce fichier entier comme premier message à une nouvelle instance Claude Code.**
> Il est autosuffisant : l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.
>
> **Dernière mise à jour : 2026-07-13 (fin de session « infra »).**

---

## 🎯 Mission

Tu reprends le développement de **NexaWork** (plateforme collaborative de gestion de projets — sujet de
mémoire de master). **Réponds toujours en français.**

- **Backend** : 9 microservices Spring Boot 3.5 / Java 21.
- **Frontend** : Angular 20.
- **Phase actuelle** : **correction post-tests**. L'intégration frontend↔backend est **terminée**.
  L'utilisateur déroule l'application dans le navigateur, te signale les bugs, tu les corriges
  **à la racine** — jamais de contournement, jamais de donnée simulée.

## 📖 PREMIÈRE ACTION — lis ces fichiers dans l'ordre

1. **`nexawork/notes/IMPLEMENTATION_STATUS.md`** — l'état d'avancement réel. Ton point d'entrée.
   (Sa **§4 « Notes d'environnement »** contient le diagnostic infra complet — lis-la vraiment.)
2. **`nexawork/notes/PLAN_TEST_FINAL.md`** — la checklist de test et la séquence de démarrage Docker.
3. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel
   V5.1, **source de vérité** de l'application.
4. Vérifie l'état réel : `git log --oneline -15`, `git status`, `docker compose ps`.

---

## 📍 OÙ ON EN EST (2026-07-13)

L'intégration est finie. Une longue session de correction a suivi (~40 commits). La session du 13/07 a été
consacrée à l'**infrastructure** : la cause racine du « serveur ne répond pas » est **trouvée et corrigée**.

### 🆕 État à la reprise
- **La base a été VIDÉE** (volumes `postgres_data`, `minio_data`, `redis_data`, `rabbitmq_data` supprimés).
  L'utilisateur repart de **zéro** : aucun utilisateur, aucun projet. La première action navigateur est une
  **inscription**. Ne t'étonne pas de listes vides — c'est voulu.
- **La stack tourne** : 14 conteneurs `healthy`, `http://localhost:4200` répond.
- **6 commits sont à pousser** : le proxy TLS du réseau fait échouer `git push` **depuis l'agent** (timeout).
  Demande à l'utilisateur de le faire lui-même :
  ```
  ! git push origin backend/dev
  ```

### 🐳 DOCKER — après chaque correction backend
```cmd
docker compose build <service>
docker compose up -d --no-deps --force-recreate <service>
docker compose logs --since 15m <service> | findstr /I "Started ERROR"
```
⚠️ **Toujours vérifier que le conteneur tourne sur le code récent** (l'heure de `Started …Application` doit
être récente). L'utilisateur a plusieurs fois testé sans avoir recréé le conteneur, et cru à un bug.

---

## ✅ DÉJÀ CORRIGÉ (ne pas refaire)

### 🔴 « Le serveur ne répond pas » — CAUSE RACINE RÉELLE (session du 13/07)
Le diagnostic précédent (« absence de `-Xmx` ») était **incomplet** : borner le tas était nécessaire mais
**très insuffisant**. Mesure de la VM Docker (4,9 Go) : `used 3870 Mo, free 95 Mo, **SWAP 1034 Mo**`.
**Aucun OOM au `dmesg`** — le noyau ne tuait personne, il **swappait**, ce qui est pire :

1. les JVM se figeaient (Hikari : `Thread starvation or clock leap detected`, housekeeper delta **1 min 17 s**) ;
2. les clients PostgreSQL coupaient → `Broken pipe` / `connection to client lost` / `exit code 2` ;
3. le postmaster y voyait un **crash** → `terminating any other active server processes` → récupération ;
4. la récupération n'aboutissait **jamais** (`syncing data directory` > 50 s, disque saturé par le swap)
   → `last known up` figé sur **3 crashs successifs** → **boucle de crash** → toutes les requêtes échouent.

- **Cause n°1 (la plus grosse) : Hikari n'était configuré NULLE PART.** Son défaut est
  `maximum-pool-size=10` **ET `minimum-idle=10`** → chaque service gardait **10 connexions ouvertes en
  permanence**. Or **1 connexion = 1 processus PostgreSQL (~7 Mo)** : 9 services = **90 processus (~630 Mo)**
  maintenus **même application au repos**, pour un `max_connections` de 100.
  → `nexawork-config-repo/application.yml` : pool **5 max / 1 idle** + recyclage.
- **Cause n°2 : `-Xmx` ne borne que le tas.** Metaspace, piles de threads, code JIT et buffers directs s'y
  ajoutent (`project-service` **mesuré à 458 Mo** pour `Xmx=256m`), et **rien ne bornait le conteneur**.
  → `Xmx` 256→192m, metaspace 192→160m, `-Xss512k`, **JIT C1 seul** (`-XX:TieredStopAtLevel=1`),
  `+ExitOnOutOfMemoryError`, **`mem_limit` sur les 13 conteneurs**, **768m garantis à PostgreSQL**,
  **`restart: unless-stopped`** (une panne se répare seule).

**Résultat mesuré** : connexions PostgreSQL **90 → 8** · `used` **3870 → 3185 Mo** · **swap 1034 → 1 Mo**.

> ⚠️ **Si l'utilisateur re-signale « le serveur ne répond pas », NE recommence PAS ce diagnostic.**
> Vérifie d'abord : `docker run --rm alpine free -m` (le **swap doit rester ~0**) et
> `docker exec nexawork-postgres psql -U postgres -tc "SELECT count(*) FROM pg_stat_activity WHERE backend_type='client backend';"`
> (**doit rester < 20**). Si ces deux chiffres sont bons, la cause est **ailleurs** — cherche ailleurs.

### 🔴 Page blanche / `ERR_CONNECTION_RESET` sur les chunks JS — PAS un bug de code
Cause : **le relais de port de Docker Desktop était corrompu**. `wslrelay.exe` (démarré 9 jours plus tôt)
tenait `127.0.0.1:4200` et le pointait vers un conteneur frontend **recréé depuis**. Sur Windows, **la
liaison la plus spécifique gagne** : tout le trafic loopback allait au relais mort au lieu de nginx.
- Symptômes trompeurs : chunks qui échouent *par intermittence*, **noms de chunks qui n'existent plus**
  (le relais servait la mémoire d'un ancien build), alors que le conteneur répondait **HTTP 200** sur le
  réseau Docker interne.
- **Diagnostic** : `netstat -ano | grep ":4200"` → si **deux** listeners (`0.0.0.0` ET `127.0.0.1`), c'est ça.
- **Correctif** : **redémarrer Docker Desktop** (il reconstruit tous ses relais). Un `--force-recreate` du
  conteneur **ne suffit pas** — le problème est au-dessus de Docker.
- Aussi appliqué : port publié en **IPv4 explicite** (`0.0.0.0:4200:80`) — avec `4200:80`, Docker publiait
  aussi sur `[::]:4200`, or `localhost` se résout en `::1` **avant** `127.0.0.1`.

### Autres causes racines d'infrastructure
- **WebSocket en boucle (`/ws/notifications failed`)** : le handshake WS n'était pas dans la liste blanche du
  gateway. Un WebSocket natif ne peut pas porter d'en-tête `Authorization` → 401 → reconnexion toutes les 4 s.
  Fix : `/ws/**` dans `PublicPathMatcher` + `PrefixPath` du context-path sur les routes WS.
- **Zombies Docker** : `init: true` (tini en PID 1) sur tous les services.
- **Timeout HTTP** : 60 s, et **uploads/downloads exclus** du timeout (`error.interceptor.ts`).

### Fin des données mockées
- Pages **Projets**, **Canaux**, **Équipes** : composants index réels, données et mutations réelles.
- **Canaux d'un projet**, **en-tête projet**, **compteurs** (membres, mentions, en ligne), **mentions**
  (@ @@ @@@ #) : réels et **contextuels** (projet vs workspace).

### Backend développé pendant la correction
- `messaging` : `message_attachments` (**V2**), `MessageType` réduit à `USER` (**V3**), **« est en train
  d'écrire »** (STOMP), `memberCount`/`lastActivityAt` sur `ChannelResponse`.
- `ged` : fichiers **à la racine** sans dossier (**V2**), `/ged/files/all` (récursif), **corbeille des dossiers**.
- `project` : endpoints équipes, **event `task.commented`**, `taskKey` dans les PJ,
  **`V5` → `owner_user_id` NULLABLE** (voir ci-dessous).
- `notification` : consumer `task.commented` ; `targetUrl` → `/app/projets/{pid}/kanban?task={id}`.
- `meeting` : `CallStatus` réduit à `ACTIVE`/`ENDED` (**V2**), `scheduled_at` supprimé (**V3**).

### Fonctionnel
- **Création de projet réparée** : la décision « le créateur n'est ni membre ni chef » faisait écrire
  `ownerUserId = null`, mais **la colonne était restée `NOT NULL`** → *toute* création échouait
  (`violates not-null constraint`). Fix : migration **V5** (colonne nullable) + entité + **`ProjectGuard
  .isProjectLead()` rendu null-safe** (il levait une `NullPointerException` sur tout projet sans chef).
- **Sidebar : indicateur de mise à jour.** Après une mutation, la liste affiche « Mise à jour… » + spinner
  + liste estompée, **pendant toute la fenêtre où elle est périmée** (envoi de la mutation → fin du refetch).
  Mécanisme : `DataRefreshService.mutating(domain)` (opérateur RxJS) + `workspaceQuery` (expose `loading`).
  Au passage : `ChannelsService.rename()` ne rafraîchissait **aucune** sidebar (aucun bump) — corrigé.
- Fiche de tâche : **mode édition**, statut contrôlé par la **FSM** avec erreur **inline**, refresh du Kanban.
- **Aperçu GED réel** (PDF en iframe, images), **PJ fonctionnelles partout**, **messages chronologiques**,
  **loaders** sur les écrans principaux.

---

## 🚨 PIÈGES QUI ONT DÉJÀ COÛTÉ DU TEMPS

1. **Compiler AVANT d'affirmer que c'est bon.**
   ```bash
   cd nexawork-backend
   JAVA_HOME="/c/Program Files/Java/jdk-21" MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT" \
     mvn -o -q -pl nexawork-<service>-service compile
   ```
   Frontend : `cd nexawork-frontend && npx ng build --configuration=development`.
2. **Migrations Flyway** : ne JAMAIS modifier une migration déjà appliquée (checksum mismatch → le service
   refuse de démarrer). Si tu resserres une contrainte CHECK, **reclasse d'abord les lignes existantes**.
3. **⚠️ Un changement d'entité JPA exige une migration.** Le bug `owner_user_id` vient exactement de là :
   le code a changé, la colonne non. **Quand tu touches une entité, vérifie le schéma.**
4. **Démarrage à froid LENT** : 9 JVM sur 2 cœurs **dépassent la période de grâce de 5 min** des
   healthchecks → état `unhealthy` **transitoire**. **Ce n'est pas une panne : attendre.** Compter
   **~20-30 min** pour une stack repartie de zéro. Ne conclus pas à un échec avant d'avoir lu les logs.
5. **`RABBITMQ_VM_MEMORY_HIGH_WATERMARK` est DÉPRÉCIÉE** — sa seule présence fait **refuser le démarrage** de
   l'image `rabbitmq:3-management`. Inutile : RabbitMQ lit la limite du cgroup, `mem_limit` suffit.
6. **Zombie au `docker compose down`** : les conteneurs créés **avant** `init: true` peuvent refuser de
   s'arrêter (`PID … is zombie and can not be killed`) → `docker rm -f <conteneur>`.
7. **Scripts `.sh`** : Edit/Write les réécrit en **CRLF** → casse en conteneur Linux. Repasser en LF :
   `sed -i 's/\r$//' scripts/init-rabbitmq.sh`.
8. **Nouvelle queue RabbitMQ** → relancer le sidecar : `docker compose up -d --force-recreate rabbitmq-init`.
9. **Jamais `docker compose build --no-cache frontend`** (le proxy TLS ferait échouer `npm install`).
10. **Ne jamais activer `SPRINGDOC_ENABLED`** (init mesurée à 81 s → sature le CPU, timeouts).
11. Les logs `WebSocketMessageBrokerStats` (toutes les 30 min) et les `Connection reset` RabbitMQ sont des
    **INFO/WARN bénins**, pas des erreurs.
12. **Ne conclus pas sans preuve.** Cette session : j'ai d'abord accusé le GED (156 % CPU) — c'était un
    **symptôme** (les pools Hikari retentaient en rafale pendant que PostgreSQL était mort), puis j'ai
    supposé un OOM — **le `dmesg` était vide**. Les deux hypothèses étaient fausses. **Mesure, puis conclus.**

---

## 🔒 RÈGLES NON NÉGOCIABLES

1. **Aucune donnée mockée, simulée ou codée en dur** dans le livrable. Tout vient du backend. Si une donnée
   n'existe pas côté backend, on **développe l'endpoint** — on n'invente pas de valeur d'affichage.
2. **Corriger à la racine**, jamais masquer le symptôme. **Vérifie dans le code avant d'affirmer** qu'une
   chose est implémentée (le référentiel a déjà sur-affirmé plusieurs fois).
3. **Ne change pas le design ni les workflows du frontend.** On corrige des bugs, on ne redessine pas.
4. **Git** : tu peux commiter toi-même. **Pas de trailer `Co-Authored-By`.** Ne JAMAIS faire
   `git checkout main` depuis `backend/dev` (les branches diffèrent de milliers de fichiers ; un verrou
   Windows a déjà corrompu un checkout en plein milieu). **`git push` échoue depuis l'agent** (proxy TLS) →
   demander à l'utilisateur.
5. **V5.1 est la source de vérité** : toute divergence constatée → corriger `nexawork-reference-v5.md`.
6. **`IMPLEMENTATION_STATUS.md` à jour** après chaque correction significative.
7. Valider chaque correction par une **compilation réelle** avant de la déclarer faite.

---

## 🚦 DÉMARRAGE

1. Lis les fichiers de référence ci-dessus.
2. `git status` (6 commits à pousser — demande à l'utilisateur) et `docker compose ps`.
3. **Attends que l'utilisateur signale le prochain bug**, puis corrige méthodiquement :
   **localiser dans le code → corriger à la racine → compiler/builder → commiter → indiquer quoi rebuild.**

### 🧪 Points à vérifier au prochain test navigateur (base vierge, tout est à recréer)
Le parcours est à refaire depuis l'inscription — c'est l'occasion de valider la chaîne complète :

- [ ] **Inscription → email de vérification → connexion** (les emails partent réellement ; le proxy TLS est
      intermittent mais les envois sont `@Async`, un échec SMTP ne bloque jamais la requête HTTP).
- [ ] **Création du workspace**, puis **invitation** d'un second compte (parcours à 3 branches).
- [ ] **Création de projet** — **c'était cassé, c'est le premier test à faire.**
- [ ] **Canaux auto** (#général, #annonces) créés à la création d'un projet :
      `docker compose logs messaging-service | findstr /I "project.created Canal"`.
- [ ] **Sidebar** : supprimer/renommer/créer un canal → bandeau « Mise à jour… » visible, puis liste à jour.
- [ ] **WebSocket** : console F12 propre ; `/ws/notifications` en **101 Switching Protocols**.
- [ ] **Recherche globale** : elle renvoyait **0 résultat**. Les erreurs backend sont avalées par un
      `catchError` dans `search.service.ts` → **retire-le temporairement pour voir la vraie erreur** avant
      de débugger les endpoints `/search` des 4 services.
- [ ] **Notification de commentaire** → clic → doit ouvrir la fiche de tâche.
- [ ] **Équipes d'un projet archivé** : l'utilisateur les voyait vides (le backend autorise pourtant la lecture).
- [ ] **Rapports PDF** (OpenPDF) et **Meetings** (JaaS) : jamais exercés en vrai.
