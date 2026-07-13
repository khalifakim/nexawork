# NexaWork — Reprise de session (phase de correction post-tests)

> **Copie-colle ce fichier entier comme premier message à une nouvelle instance Claude Code.**
> Il est autosuffisant : l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.
>
> **Dernière mise à jour : 2026-07-13.**

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
2. **`nexawork/notes/PLAN_TEST_FINAL.md`** — la checklist de test et la séquence de démarrage Docker.
3. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel
   V5.1, **source de vérité** de l'application.
4. Vérifie l'état réel : `git log --oneline -15` et `git status` (branche `backend/dev`).

---

## 📍 OÙ ON EN EST

L'intégration est finie ; une longue session de correction a suivi (~35 commits). Le travail restant :
**poursuivre les corrections signalées par l'utilisateur**.

### ⚠️ GIT — à traiter en premier
**Des commits locaux ne sont pas poussés** : le proxy TLS du réseau fait échouer `git push` **depuis
l'agent** (timeout). Demande à l'utilisateur de les pousser lui-même :
```
! git push origin backend/dev
```

### 🐳 DOCKER
13 conteneurs. Après chaque correction backend, l'utilisateur doit **build ET recréer** le service :
```cmd
docker compose build <service>
docker compose up -d --no-deps --force-recreate <service>
docker compose logs --since 15m <service> | findstr /I "Started ERROR"
```
⚠️ **Toujours vérifier que le conteneur tourne sur le code récent** (l'heure de `Started …Application` doit
être récente). L'utilisateur a plusieurs fois testé sans avoir recréé le conteneur, et cru à un bug.

---

## ✅ DÉJÀ CORRIGÉ (ne pas refaire)

**Causes racines d'infrastructure**
- **« Le serveur ne répond pas »** : cause = **aucune limite mémoire JVM**. Sans `-Xmx`, chaque JVM en
  conteneur réserve ~25 % de la RAM Docker (~1,2 Go × 9 services sur 4,8 Go) → swap permanent → timeouts,
  famine Hikari, connexions PostgreSQL perdues. Fix : anchor `x-java-opts` dans `docker-compose.yml`
  (`-Xmx256m -XX:+UseSerialGC`) appliqué aux 9 services.
- **WebSocket en boucle (`/ws/notifications failed`)** : cause = le handshake WS n'était **pas** dans la
  liste blanche du gateway. Or un WebSocket natif ne peut pas porter d'en-tête `Authorization` → 401 →
  reconnexion toutes les 4 s. Fix : `/ws/**` ajouté à `PublicPathMatcher` + `PrefixPath` du context-path
  sur les routes WS (`nexawork-config-repo/nexawork-gateway.yml`).
- **Zombies Docker** : `init: true` (tini en PID 1) sur tous les services.
- **Timeout HTTP** : 60 s, et **uploads/downloads exclus** du timeout (`error.interceptor.ts`).

**Fin des données mockées** (le frontend affichait de fausses données)
- Pages **Projets** et **Canaux** : composants index réels (ouvrent le 1er élément ou un état vide).
- Page **Équipes** : réécrite sur données réelles + toutes les mutations backend.
- **Canaux d'un projet**, **en-tête projet**, **compteurs** (membres, mentions, en ligne), **mentions**
  (@ @@ @@@ #) : réels et **contextuels** (projet vs workspace).

**Backend développé pendant la correction**
- `messaging` : `message_attachments` (**V2**, PJ multiples par message), `MessageType` réduit à `USER`
  (**V3**), indicateur **« est en train d'écrire »** (STOMP), `memberCount`/`lastActivityAt` sur `ChannelResponse`.
- `ged` : fichiers **à la racine** sans dossier (**V2**), endpoint `/ged/files/all` (récursif),
  **corbeille des dossiers** (trash/restore/purge).
- `project` : endpoints équipes (update/delete), **event `task.commented`** (notifie tous les membres du
  projet), `taskKey` dans les pièces jointes.
- `notification` : consumer `task.commented` (queue `nexawork.notification.task-commented`) ; `targetUrl`
  corrigé en `/app/projets/{pid}/kanban?task={id}` → ouvre la fiche de tâche au clic.
- `meeting` : `CallStatus` réduit à `ACTIVE`/`ENDED` (**V2**), `scheduled_at` supprimé (**V3**).

**Fonctionnel**
- Fiche de tâche : **mode édition** (crayon → champs → ✓), statut contrôlé par la **FSM** avec erreur
  **inline**, refresh du Kanban sans rechargement, vrai nom du commentateur.
- Création de tâche : membres/équipes **réels**, champs **obligatoires** (astérisques), bouton « Parcourir ».
- **Aperçu GED réel** (PDF en iframe, images) — c'était une maquette.
- **Pièces jointes** fonctionnelles partout (tâches, commentaires, canaux, conversations, GED).
- **Messages en ordre chronologique** (anciens en haut).
- **Loaders** sur les écrans principaux.
- Le **créateur d'un projet n'est plus ajouté** au projet (ni membre, ni chef — décision utilisateur).

---

## 🚨 PIÈGES QUI ONT DÉJÀ COÛTÉ DU TEMPS

1. **Compiler AVANT d'affirmer que c'est bon.** Une erreur (`cannot find symbol: variable userId`) est passée
   jusqu'au build Docker parce que `project-service` ne compilait pas hors ligne (OpenPDF absent du cache
   Maven). **OpenPDF est maintenant dans le cache local**, donc ceci fonctionne :
   ```bash
   cd nexawork-backend
   JAVA_HOME="/c/Program Files/Java/jdk-21" MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT" \
     mvn -o -q -pl nexawork-<service>-service compile
   ```
   Frontend : `cd nexawork-frontend && npx ng build --configuration=development`.
2. **Migrations Flyway** : ne JAMAIS modifier une migration déjà appliquée (checksum mismatch → le service
   refuse de démarrer). Si tu resserres une contrainte CHECK, **reclasse d'abord les lignes existantes**.
   En dernier recours (données de test) : `DROP DATABASE … WITH (FORCE);` puis `CREATE DATABASE …`
   (deux commandes `psql -c` **séparées** — `DROP DATABASE` ne passe pas dans un bloc transactionnel).
3. **Scripts `.sh`** : Edit/Write les réécrit en **CRLF** → casse en conteneur Linux. Repasser en LF :
   `sed -i 's/\r$//' scripts/init-rabbitmq.sh`.
4. **Nouvelle queue RabbitMQ** → relancer le sidecar : `docker compose up -d --force-recreate rabbitmq-init`.
5. **Jamais `docker compose build --no-cache frontend`** (le proxy TLS ferait échouer `npm install`).
6. **Ne jamais activer `SPRINGDOC_ENABLED`** (init mesurée à 81 s → sature le CPU, timeouts).
7. Les logs `WebSocketMessageBrokerStats` (toutes les 30 min) et les `Connection reset` RabbitMQ sont des
   **INFO/WARN bénins**, pas des erreurs.

---

## 🔒 RÈGLES NON NÉGOCIABLES

1. **Aucune donnée mockée, simulée ou codée en dur** dans le livrable. Tout vient du backend. Si une donnée
   n'existe pas côté backend, on **développe l'endpoint** — on n'invente pas de valeur d'affichage.
2. **Corriger à la racine**, jamais masquer le symptôme. **Vérifie dans le code avant d'affirmer** qu'une
   chose est implémentée (le référentiel a déjà sur-affirmé plusieurs fois).
3. **Ne change pas le design ni les workflows du frontend.** On corrige des bugs, on ne redessine pas.
4. **Git** : tu peux commiter toi-même. **Pas de trailer `Co-Authored-By`.** Ne JAMAIS faire
   `git checkout main` depuis `backend/dev` (les branches diffèrent de milliers de fichiers ; un verrou
   Windows a déjà corrompu un checkout en plein milieu).
5. **V5.1 est la source de vérité** : toute divergence constatée → corriger `nexawork-reference-v5.md`.
6. **`IMPLEMENTATION_STATUS.md` à jour** après chaque correction significative.
7. Valider chaque correction par une **compilation réelle** (piège n°1) avant de la déclarer faite.

---

## 🚦 DÉMARRAGE

1. Lis les fichiers de référence ci-dessus.
2. `git status` (des commits sont à pousser — demande à l'utilisateur) et `docker compose ps`.
3. **Attends que l'utilisateur signale le prochain bug**, puis corrige méthodiquement :
   **localiser dans le code → corriger à la racine → compiler/builder → commiter → indiquer quoi rebuild.**

### Points à revérifier au prochain test navigateur
- **WebSocket** : console F12 propre ; `/ws/notifications` doit passer en **101 Switching Protocols**.
- **Recherche globale** : elle renvoyait **0 résultat** (les erreurs backend sont avalées par un `catchError`
  dans `search.service.ts`). À revérifier maintenant que le gateway est corrigé ; si toujours vide, débugger
  les endpoints `/search` des 4 services.
- **Canaux auto** (#général, #annonces) à la création d'un projet : le consumer et la binding RabbitMQ
  existent → `docker compose logs messaging-service | findstr /I "project.created Canal"`.
- **Notification de commentaire** → clic → doit ouvrir la fiche de tâche.
- **Équipes d'un projet archivé** : l'utilisateur les voyait vides (le backend autorise pourtant la lecture).
