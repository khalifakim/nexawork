# NexaWork Backend — Reprise du développement (prompt réutilisable)

> **Usage** : copie-colle ce fichier entier comme prompt à une nouvelle instance Claude Code
> pour qu'elle continue le développement backend là où il s'est arrêté. Réutilisable à
> l'identique à n'importe quel moment (aucun mot à changer) — l'instance se localise seule
> via `IMPLEMENTATION_STATUS.md` + `git status`.
>
> **Conseil** : change d'instance de préférence entre deux phases (phase finie + commitée).
> Si tu switches au milieu d'une phase, demande d'abord à l'instance en cours de mettre à jour
> `IMPLEMENTATION_STATUS.md` avec l'avancement partiel, puis commit — la nouvelle instance
> aura ainsi une photo fidèle.

---

## 🎯 Ta mission

Tu reprends le développement backend de **NexaWork**, plateforme de travail collaboratif (9 microservices Spring Boot 3.5 / Java 21). Le projet est développé **phase par phase** (Phase 0 à Phase 9). Ta mission : **continuer là où le projet s'est arrêté**, jusqu'à la fin, en suivant strictement le plan directeur et en répliquant les patterns du service de référence Smart-Mifin. Tu ne devines pas où on en est : tu le **découvres** en lisant les fichiers ci-dessous.

## 📖 Première action OBLIGATOIRE — localise-toi, puis lis

Avant TOUTE action, exécute cette séquence de localisation :

1. **Lis `D:\memoire-master\nexawork\notes\IMPLEMENTATION_STATUS.md`** — c'est le journal de bord : il te dit quelles phases sont ✅ livrées et laquelle est ⏳ la prochaine. **C'est ton point d'entrée.**
2. **Vérifie l'état réel du dépôt** pour détecter un éventuel travail en cours non encore consigné :
   - `git branch --show-current` (doit être `backend/dev`)
   - `git log --oneline -5` (voir le dernier commit livré)
   - `git status` (détecter des fichiers modifiés/non commités = une phase peut être en cours au milieu)
   - `docker compose ps` (voir quels services tournent déjà)
3. **Déduis ton point de départ** :
   - Si `git status` est propre et `IMPLEMENTATION_STATUS.md` montre la Phase N comme dernière ✅ livrée → tu démarres la **Phase N+1** (la première ⏳).
   - Si `git status` montre du travail non commité sur un service → une phase est **en cours** ; lis les fichiers concernés + `git diff`, compare au plan pour cette phase, et **reprends-la là où elle s'est arrêtée** (ne recommence pas de zéro, ne re-crée pas ce qui existe).
   - En cas de doute sur l'état exact, **demande au user** de confirmer où il en est avant de coder.

Ensuite, lis les références de contexte :

4. **`D:\memoire-master\docs-config\memoire\notes\PLAN_DEV_BACKEND.md`** — plan directeur : décisions actées (§E), grille de mapping Smart-Mifin (§F), critères d'acceptation par phase (§C).
5. **`D:\memoire-master\docs-config\memoire\conception\references\nexawork-reference-v5.md`** — référentiel fonctionnel V5.1 (source de vérité). Parties : §4 (modèle), §5 (SQL), §6 (enums), §7 (RabbitMQ + WebSocket), §9.9 (JaaS), §13 (endpoints REST), §14 (guide phase-par-phase).
6. **Le dernier service livré** dans `D:\memoire-master\nexawork\nexawork-backend\` (identifié via IMPLEMENTATION_STATUS.md) — c'est ton gabarit vivant le plus récent. Le premier service complet et validé, `nexawork-auth-service`, est le **template maître** : même arborescence de packages et mêmes patterns pour tous.
7. **`D:\memoire-master\nexawork\nexawork-backend\nexawork-commons\`** — module partagé (Auditable, TokenProvider, JWTFilter, SecurityRule, Response, EntityMapper, exceptions). Tu le RÉUTILISES ; tu n'y ajoutes que du technique réutilisable, jamais de code métier.
8. **Smart-Mifin (patterns de référence)** : `D:\FormationStageWebgram\Projets\smart-mifin\smart-mifin-stage-backend\src\main\java\sn\webg\smartmifin\` — arborescence, sécurité, audit, conventions à répliquer.

## 📦 Contexte projet

- **Repo code** : `D:\memoire-master\nexawork\` — branche active **`backend/dev`**. Remote : `github.com/khalifakim/nexawork.git`.
- **Repo docs** (séparé) : `D:\memoire-master\docs-config\` — V5.1 + plan. Branche `main`.
- **Frontend Angular** : `D:\memoire-master\nexawork\nexawork-frontend\` — **terminé, NE PAS MODIFIER** (swap mock→HTTP = Phase 10, en dernier). C'est le contrat que le backend satisfait ; tu peux le LIRE (`src/app/core/services/`, `data.providers.ts`).
- **Infra Docker** : `docker-compose.yml` racine — PostgreSQL 17 (port hôte 5433), Redis 7, RabbitMQ 3, MinIO, config-server (8888), + les microservices.
- **`.env`** (gitignoré) : credentials PostgreSQL/RabbitMQ/MinIO/JaaS/SMTP/VAPID. Lecture seule.

## 🗺️ Ordre des phases (IMPOSÉ — la prochaine à faire est indiquée par IMPLEMENTATION_STATUS.md)

- **Phase 3 · API Gateway** (8080) — routage, `JwtAuthFilter` global (validation signature + injection `X-User-Id`/`X-Org-Id`/`X-Org-Role`), CORS, forwarding WebSocket. Réf : V5.1 §14.10 + §13.8.
- **Phase 4 · Project Service** (8082) — projets, tâches, FSM Kanban, équipes, dashboard. Events `project.created`/`task.assigned`/`livrable.validated`/`file.attached.to.task`. Règles R1, R6-R21, REF E. Réf : V5.1 §4.2, §5.2, §6.2, §13.2, §14.11.
- **Phase 5 · File Service** (8086) — MinIO, SHA-256, routage 3 buckets. Réf : V5.1 §4.3, §5.3, §13.3, §14.12.
- **Phase 6 · GED Service** (8087) — arborescence, versions, accès, dossier virtuel TASK_ATTACHMENTS. Consumers `project.created`/`file.attached.to.task`. Règles REF G, R11-R13, R16. Réf : V5.1 §4.4, §5.4, §13.4, §14.13.
- **Phase 7 · Messaging Service** (8083) — canaux, conversations, messages, WebSocket STOMP, `readAt`. Consumers `project.created`/`call.ended`. Règles REF D/F, R14-R16. Réf : V5.1 §4.5, §5.5, §7.5, §13.5, §14.14.
- **Phase 8 · Notification Service** (8085) — consomme 4 events RabbitMQ, WebSocket push, Redis présence, Web Push VAPID. Réf : V5.1 §4.7, §7.5, §13.7.
- **Phase 9 · Meeting Service** (8084, EN DERNIER) — JaaS JWT RS256, Call/CallParticipant, REF A/B, publisher `call.ended`. Réf : V5.1 §4.6, §5.6, §9.9, §13.6.

⚠️ **L'ordre §14 de V5.1 est inversé** : Notification (Phase 8) AVANT Meeting (Phase 9). La visio est demandée en dernier.

## 📋 Méthode à suivre pour CHAQUE phase

1. **Lecture** — §C Phase N du plan + parties V5.1 référencées (modèle §4.X, SQL §5.X, enums §6.X, events §7, endpoints §13.X). Regarde comment le template Auth a résolu les mêmes problèmes.
2. **Proposition** — Présente au user la **liste précise des fichiers à créer/modifier**, une phrase par fichier. **Attends sa validation explicite avant de coder.**
3. **Développement** — Réplique strictement Smart-Mifin et le template Auth : mêmes packages (`annotations`, `aspects`, `configurations`, `controllers`, `dtos/requests|responses`, `entities/enums`, `events/publishers|consumers`, `exceptions`, `mappers`, `properties`, `repositories`, `security/jwt|rules`, `services/impl`), `Response<T>` partout, `EntityMapper` MapStruct, règles REF/R côté serveur (403/404/409/422). Ajoute le module au parent POM et à `docker-compose.yml` (build context `./nexawork-backend`, Dockerfile multi-module — copie le pattern de l'auth-service).
4. **Build & test** — `docker compose build <service>` puis `up -d` → healthy, puis curl les critères d'acceptation du plan. (Voir « Notes d'environnement ».)
5. **Doc en continu** — Toute incohérence/manque dans V5.1, ou précision d'implémentation → **corrige V5.1 immédiatement** (`docs-config/.../nexawork-reference-v5.md`), pendant le dev.
6. **Fin de phase** — Mets à jour **`nexawork/notes/IMPLEMENTATION_STATUS.md`** (statut + détail livré + modifs V5.1 + notes d'environnement éventuelles). Produis un compte-rendu : résumé, fichiers créés/modifiés, résultats des tests, écarts au plan, **confirmation d'alignement V5.1 vérifiée section par section**, et **deux blocs Git** (Bloc A = repo `nexawork` ; Bloc B = repo `docs-config` si V5.1 modifié).
7. **Attente du feu vert** — N'enchaîne JAMAIS sur la phase suivante sans que le user dise « OK, passe à la suite ».

## 🔒 Contraintes NON NÉGOCIABLES

1. **Git : tu ne commits JAMAIS.** Pas de `git add/commit/push/checkout/merge/rebase/branch`. Le user gère tout Git. Tu peux LIRE (`git status/log/diff/branch --show-current`). Fin de phase → tu proposes les commandes (Bloc A + Bloc B), le user exécute.
2. **Respect strict de Smart-Mifin** — mêmes packages, mêmes patterns, mêmes conventions.
3. **Respect strict des règles REF A-I et R1-R21** — côté serveur, pas seulement frontend.
4. **Ne pas modifier le frontend** (sauf Phase 10).
5. **Ne rien inventer** — info manquante → V5.1 ; si ambigu → demande au user.
6. **`.env`** : lecture seule. **`nexawork-commons`** : technique réutilisable uniquement, jamais de métier.
7. **Package racine** : `com.nexawork.{service}`.
8. **Adaptations Spring Boot 2.7→3.5** : `javax.*`→`jakarta.*`, `antMatchers`→`requestMatchers`, `authorizeRequests`→`authorizeHttpRequests`, JJWT 0.11.5→0.12.x, PK Long→UUID, `@EnableGlobalMethodSecurity`→`@EnableMethodSecurity`, springdoc 1.x→2.x.

## ⚙️ Notes d'environnement (lis avant de builder/tester)

- **Build Maven sur l'hôte Windows** : nécessite `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` (proxy TLS d'entreprise, sinon PKIX failed). JDK 21 : `C:\Program Files\Java\jdk-21` (force `JAVA_HOME` dessus, le Maven par défaut tourne en JDK 17).
- **Le build Docker n'est PAS affecté** — privilégie `docker compose build <service>` pour valider (chemin canonique).
- **Testcontainers** : Docker Desktop de cette machine renvoie un 400 sur `/info` à docker-java (quirk connu). Conditionne tes tests d'intégration par `@EnabledIfEnvironmentVariable(named="RUN_INTEGRATION_TESTS", matches="true")` — ignorés par défaut, build vert. Valide plutôt en live (curl contre le conteneur healthy).
- **PowerShell découpe les args sur les points** — pour `mvn -Dx.y=z`, passe par un conteneur Maven ou écris les propriétés dans le pom.
- **Flyway checksum mismatch** (résidus) : `docker exec nexawork-postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS nexawork_<x>_db WITH (FORCE);" -c "CREATE DATABASE nexawork_<x>_db;"'` puis redémarre le service.

## 🚀 Démarrage

Applique la séquence de localisation (section « Première action »), déduis la phase à traiter (prochaine ⏳, ou reprise d'une phase en cours), relis les références de cette phase, puis **propose au user la liste des fichiers avant de coder**. Ne code rien avant sa validation. Si Docker Desktop est éteint, demande au user de le relancer.

Le user est disponible pour valider chaque étape.
