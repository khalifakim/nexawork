# NexaWork — Reprise de session (phase de correction post-tests)

> **Copie-colle ce fichier entier comme premier message à une nouvelle instance Claude Code.**
> Il est autosuffisant : l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.
>
> **Dernière mise à jour : 2026-07-15 (session « temps réel : présence, saisie, accusés de lecture » + pédagogie WebSocket & revue du schéma d'architecture).**

---

## 🎯 Mission

Tu reprends le développement de **NexaWork** (plateforme collaborative de gestion de projets — sujet de
mémoire de master). **Réponds toujours en français.**

- **Backend** : 9 microservices Spring Boot 3.5 / Java 21. **Frontend** : Angular 20.
- **Phase actuelle** : **correction post-tests**. L'intégration frontend↔backend est **terminée**.
  L'utilisateur déroule l'application dans le navigateur, te signale les bugs, tu les corriges
  **à la racine** — jamais de contournement, jamais de donnée simulée.

## 📖 PREMIÈRE ACTION — lis ces fichiers dans l'ordre

1. **`nexawork/notes/IMPLEMENTATION_STATUS.md`** — l'état d'avancement réel. Ton point d'entrée.
   Sa **§2bis « Corrections post-test »** contient le détail des derniers lots (symptôme → cause racine →
   correctif). Sa **§4** contient le diagnostic infra.
2. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel V5.1,
   **source de vérité** de l'application.
3. Vérifie l'état réel : `git log --oneline -10`, `git status`, `docker compose ps`.

---

## 🟢 ÉTAT À LA REPRISE — code écrit & commité, EN ATTENTE DE REBUILD + TEST NAVIGATEUR

Depuis le lot 4, plusieurs lots ont été **écrits, compilés et commités** (voir `git log`). Les derniers commits
(du plus récent au plus ancien) :
- `2642040` **accusé de lecture en temps réel** (dernier — voir « TÂCHE EN COURS » et « CE QUI EST CORRIGÉ »).
- `37922ca` **présence + saisie** : profil/en-tête suivent la présence en direct, « en train d'écrire » découplé
  de la présence.
- `488d54f` **lot GED/File/Accueil/WS/UX** : dossier restreint (`null.map`), import 500 (auto-création des
  buckets MinIO), « Mes tâches » réorganisé, loaders invitations, **diagnostic WebSocket** (logs de fermeture).
- `ecd509b` suppression de `jaasFileId` (colonne morte de `MeetingFile`) + migration `V6`.
- `3d35b19`, `b90699a`, `89a14eb`, `93af495` : réunions (fin auto, toast rouge/croix), canaux.

**Ce qui reste : rebuild des images concernées + validation en navigateur.** Le temps réel (présence, saisie,
messages instantanés, accusés de lecture) **exige deux comptes connectés simultanément**. `git status` est
**propre** — tout est commité, rien en cours d'édition.

> ⚠️ **Rebuild à faire** (front + back messaging au minimum pour les accusés de lecture) : **dresse la liste
> depuis les fichiers modifiés de chaque commit**, pas de mémoire. Le front se rebuild à chaque changement TS ;
> `nexawork-messaging-service` pour le rebroadcast d'accusé de lecture ; `nexawork-file-service` (buckets),
> `nexawork-ged-service` (dossier restreint) pour le lot `488d54f`.

> ⚠️ **Leçon persistante** : un correctif transverse — Gateway, `commons` — touche des services qu'on n'a pas
> en tête. Dresser la liste de rebuild **depuis les fichiers modifiés**, pas de mémoire.

**Modèle de vérification d'un build** (piège n°1 — à refaire à chaque lot, avec le **vrai** chemin de la classe :
`git log --stat` donne le package exact ; un chemin faux rend `0` et fait croire à un échec) :
```bash
docker run --rm --entrypoint sh nexawork-meeting-service -c \
  "unzip -p /app/app.jar BOOT-INF/classes/com/nexawork/meeting/security/GatewayIdentityFilter.class | strings | grep -c X-User-Name"
# doit afficher 1 — si 0, le build a échoué EN SILENCE
```

---

## 🔵 TÂCHE EN COURS À LA REPRISE — pédagogie WebSocket + revue du schéma d'architecture

La session a été **interrompue en plein milieu** de cette tâche. **Reprends-la en premier.** L'utilisateur
prépare son mémoire et veut **comprendre** puis **corriger son schéma d'architecture** (`figure4_1`, une image
qu'il a jointe : Client Angular / Gateway / Services métier / RabbitMQ / Données PostgreSQL + Redis/MinIO/JaaS).

### Ce qu'il a demandé (à traiter dans l'ordre) :
1. **Expliquer, simplement mais exactement** : qu'est-ce qu'un WebSocket ? qu'est-ce qu'un « serveur » ici ?
   quel composant **frontend** ouvre la connexion WebSocket ?
2. **Le flux WebSocket étape par étape** : est-ce que le frontend passe **toujours par l'API Gateway**, y
   compris pour **établir** la connexion WebSocket ? (Réponse courte : **OUI**, voir faits vérifiés ci-dessous.)
3. **Modifier son schéma** : (a) flèche **bidirectionnelle** Frontend ↔ API Gateway pour le WebSocket ;
   (b) **même couleur** pour **Messaging** et **Notification** (ils parlent tous deux WebSocket temps réel) ;
   (c) une **légende** précisant que ces deux services communiquent en temps réel via WebSocket.
4. **Analyser le schéma** : est-il complet, cohérent, conforme à une archi microservices moderne ? Signaler
   manques / incohérences / améliorations.

### ✅ FAITS WEBSOCKET VÉRIFIÉS DANS LE CODE (ne pas re-deviner — c'est confirmé) :
- **Le WebSocket passe bien par la Gateway.** Chaîne complète :
  `Navigateur → nginx (conteneur frontend) → api-gateway:8080 → service`.
  - `nexawork-frontend/nginx.conf` : `location /ws/` proxifie vers `http://api-gateway:8080` avec
    `Upgrade`/`Connection "upgrade"` et `proxy_read_timeout 3600s` (connexions longues).
  - `nexawork-config-repo/nexawork-gateway.yml` : deux routes **`ws://`** —
    `messaging-ws` (`Path=/ws/messaging/**` → `PrefixPath=/nexawork-messaging-api-v1` → `ws://…:8083`) et
    `notification-ws` (`Path=/ws/notifications/**` → `PrefixPath=/nexawork-notification-api-v1` → `ws://…:8085`).
    Le `PrefixPath` est **indispensable** : l'endpoint STOMP est servi **sous le context-path** du service ;
    sans lui, le handshake tombe en 404 en boucle.
- **Deux connexions WebSocket distinctes**, établies paresseusement (`stomp-client.service.ts`) :
  `/ws/messaging` (canaux + conversations + « en train d'écrire ») et `/ws/notifications` (file personnelle de
  notifications + **heartbeat de présence** toutes les 20 s).
- **Le composant frontend qui ouvre la socket** : `StompClientService` (`core/ws/stomp-client.service.ts`), via
  la lib `@stomp/stompjs` (`new Client({ webSocketFactory: () => new WebSocket(url) })`). Les composants (ex.
  `conversation-privee.component.ts`) ne touchent jamais la socket directement : ils s'abonnent à des flux
  RxJS exposés par les services (`ConversationsService.live()`, `MembersService`, etc.).
- **Authentification au handshake** : un WebSocket natif **ne peut pas porter d'en-tête `Authorization`** →
  le jeton part en **query string** `?access_token=…`. La Gateway laisse `/ws/**` public mais **lit le jeton**
  pour propager l'identité (sinon session STOMP **sans Principal** : ni file privée, ni présence). L'URL est
  reconstruite à **chaque (re)connexion** avec le jeton courant (`webSocketFactory`, pas `brokerURL` figé).
- **STOMP** = sous-protocole applicatif au-dessus du WebSocket (topics `/topic/...`, files `/user/queue/...`,
  destinations applicatives `/app/...`). Topics utilisés : `/topic/channels/{id}`,
  `/topic/conversations/{id}`, `/topic/conversations/{id}/typing`, `/topic/presence`,
  `/topic/org/{id}/channel-activity` ; files : `/user/queue/notifications`, `/user/queue/channel-activity`.
- **Redis n'intervient PAS dans le transport WebSocket.** Redis ne sert **qu'à la présence** (clés
  `presence:user:{id}`, TTL ~30 s réarmé par le heartbeat), géré **uniquement** par le notification-service
  (seul service avec `spring-data-redis`). **Aucun `@Cacheable` nulle part** — pas de cache applicatif.

### 📗 EXPLICATIONS DÉJÀ DONNÉES À L'UTILISATEUR (reste cohérent avec ça — ne le contredis pas) :
L'utilisateur a déjà reçu ces réponses lors des sessions précédentes. Réutilise-les telles quelles ; ne
change pas le discours d'une session à l'autre.

- **Qu'est-ce qu'un WebSocket** : un canal **bidirectionnel** et **persistant** entre navigateur et serveur,
  ouvert par une requête HTTP « Upgrade » puis maintenu ouvert. Contrairement au REST (une requête → une
  réponse, puis on ferme), le serveur peut **pousser** des données au client **sans que celui-ci demande** —
  d'où le « temps réel ». Ici on met **STOMP** par-dessus (un format de messages : s'abonner à un *topic*,
  publier sur une *destination*).
- **Qu'est-ce qu'un « serveur » ici** : chaque microservice Spring Boot est un serveur (un processus qui écoute
  sur un port : 8081…8087). Pour le WebSocket, ce sont **messaging (8083)** et **notification (8085)** qui
  tiennent la socket ouverte côté serveur.
- **Quel composant frontend ouvre la socket** : `StompClientService` (`core/ws/stomp-client.service.ts`), et
  lui seul. Il crée un `Client` `@stomp/stompjs` avec `webSocketFactory: () => new WebSocket(url)`. Les
  composants Angular ne manipulent jamais la socket : ils s'abonnent à des `Observable` exposés par les
  services métier (`ConversationsService.live()`, `MembersService`, notifications…).

- **Redis et la présence — le point que l'utilisateur a le plus creusé** :
  - La **présence** (« qui est en ligne ») est un **état partagé**, pas un événement. Elle est stockée dans
    **Redis** sous forme de clés `presence:user:{id}` avec un **TTL ~30 s**. Le frontend envoie un
    **heartbeat** STOMP toutes les 20 s (`/app/presence/heartbeat`) qui **réarme le TTL**. Si le heartbeat
    s'arrête (onglet fermé, réseau coupé), la clé **expire toute seule** → l'utilisateur bascule hors ligne
    **sans que personne ait à le détecter activement**. C'est **ça** l'intérêt de Redis ici : un magasin
    partagé avec **expiration automatique**, que le WebSocket seul ne fournit pas.
  - **Pourquoi Redis alors qu'on a déjà le WebSocket ?** Le WebSocket sait *qu'*une socket s'ouvre/se ferme,
    mais il ne **mémorise** rien et n'est **pas partagé** entre instances/services. Redis donne (a) la
    **persistance** de l'état, (b) l'**expiration TTL** (déconnexion « sale » gérée gratuitement),
    (c) un état **consultable** par une requête REST (`GET /presence/online`) pour amorcer une vue.
  - **Pourquoi notification-service et pas messaging** : la présence est **transversale** (elle sert au profil,
    aux conversations, à la liste des membres — pas qu'à la messagerie). On la met donc dans le service des
    notifications, **seul service branché sur Redis** (`spring-data-redis`). Messaging reste focalisé sur les
    messages. **Redis n'est utilisé QUE pour la présence** — **aucun cache applicatif** (`@Cacheable`) nulle part.
  - **Deux façons de « savoir qui est en ligne » côté frontend**, complémentaires : (1) un **sondage** REST
    toutes les 20 s (`GET /presence/online`) qui amorce/rattrape l'état ; (2) le **temps réel** via
    `/topic/presence` où le notification-service **diffuse** chaque connexion/déconnexion. Sans le (2), une
    déconnexion n'apparaissait qu'au prochain sondage (jusqu'à 20 s de retard).

- **Messages instantanés / « en train d'écrire » / accusés de lecture = des ÉVÉNEMENTS** (pas des états) :
  poussés directement par WebSocket, **sans Redis**. Un message → publié sur `/topic/conversations/{id}` ;
  la saisie → `/topic/conversations/{id}/typing` (volatile, retombe après 4 s) ; l'accusé de lecture → le
  serveur **rediffuse** le message avec `readAt` sur le même topic (cf. Lot 5).

### 💡 Pistes de revue du schéma (à confirmer en regardant l'image avec l'utilisateur) :
- La flèche Client ↔ Gateway est déjà étiquetée « REST JSON / WebSocket » : bon, mais l'utilisateur veut la
  rendre **explicitement bidirectionnelle** pour le WebSocket, et **teinter Messaging + Notification** d'une
  même couleur avec **légende dédiée**. Aller dans ce sens.
- Manques/améliorations possibles à évoquer : le **flux JaaS/WebRTC** part-il bien du **navigateur** vers
  `8x8.vc` (média P2P **hors** Gateway) — à vérifier sur le schéma ; la **présence Redis** est portée par le
  **notification-service** (pas messaging) ; distinguer visuellement **synchrone** (REST/WS) et **asynchrone**
  (RabbitMQ). Rester **descriptif et honnête** : ne pas inventer de composant absent du code.

> ⚠️ Le schéma est produit par l'utilisateur (image PNG) : **tu ne peux pas l'éditer directement**. Décris
> précisément **quoi changer et où** (couleurs, flèches, légende), ou propose un diagramme Mermaid/texte qu'il
> reportera. Ne prétends pas avoir « modifié » l'image.

---

## 🚨 LES DEUX PIÈGES QUI COÛTENT LE PLUS CHER

### 1. 🔴 `docker compose build` échoue EN SILENCE (exit 0) — vérifie TOUJOURS le jar
Le réseau est derrière un **proxy TLS intercepteur**. Deux effets, tous deux **silencieux** :
- BuildKit interroge Docker Hub pour valider l'image de base → `TLS handshake timeout` → build annulé ;
- Maven, **dans** le conteneur de build, ne résout pas ses dépendances → `DependencyResolutionException`.

Dans les deux cas **`docker compose build` peut ressortir en `exit 0`** alors que rien n'a été reconstruit.
**Cela a coûté plus d'une heure** : un correctif annoncé « déployé » n'était jamais entré dans l'image, et on
a rediagnostiqué un bug déjà corrigé. **Vérifie systématiquement le contenu du jar** (commande ci-dessus)
avant d'affirmer qu'un correctif est en ligne.
- Le proxy est **intermittent** : relancer le build suffit souvent.
- S'il s'entête : `DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose build <service>`
  (le builder classique se contente des images de base locales).
- **Jamais `--no-cache` sur le frontend** (`npm install` retéléchargerait → échec proxy).

### 2. 🔴 Un build Docker fait tomber PostgreSQL → 500/401 en cascade (faux bugs)
Le build Angular consomme 1-2 Go **en plus** des 14 conteneurs, sur une VM Docker de 4,9 Go. La VM part en
**swap**, les JVM se figent, PostgreSQL refuse les connexions (`PSQLException: The connection attempt failed`,
`EOFException`), et **tout** part en 500 puis en 401 (le refresh du jeton échoue à son tour).
**Ne jamais tester pendant un build.** Avant de diagnostiquer un 500, mesure :
```bash
docker run --rm alpine free -m        # le swap doit rester bas
docker exec nexawork-postgres psql -U postgres -tc \
  "SELECT count(*) FROM pg_stat_activity WHERE backend_type='client backend';"   # doit rester < 20
```

---

## ⚠️ AUTRES PIÈGES (déjà payés)

3. **Compiler AVANT d'affirmer que c'est bon.**
   ```bash
   cd nexawork-backend
   JAVA_HOME="/c/Program Files/Java/jdk-21" MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT" \
     mvn -o -q -pl nexawork-<service>-service -am compile
   ```
   Frontend : `cd nexawork-frontend && npx ng build --configuration=development`.
   *(`mvn install` échoue en mode hors-ligne au `repackage` — normal, `compile` suffit à valider.)*
4. **Démarrage à froid LENT** : 9 JVM sur 2 cœurs dépassent la période de grâce des healthchecks → état
   `unhealthy` **transitoire**, jusqu'à ~15 min. **Ce n'est pas une panne : attendre.** Un premier appel HTTP
   sur une JVM froide peut dépasser 60 s → **504** côté navigateur alors que la requête a bien abouti côté
   serveur (déjà observé : deux réunions créées pour un seul clic).
   ⚠️ Piège de scriptage : `grep -v healthy` matche aussi **`unhealthy`**. Utiliser `grep -vE 'unhealthy|starting'`.
5. **Migrations Flyway** : ne JAMAIS modifier une migration déjà appliquée (checksum mismatch → refus de
   démarrer). **Un changement d'entité JPA exige une migration.**
6. **Nouvelle queue RabbitMQ** → `docker compose up -d --force-recreate rabbitmq-init`.
7. **`config-repo` est monté en volume** (pas besoin de rebuild) — mais le service qui le lit doit être
   **recréé** pour en tenir compte.
8. **Scripts `.sh`** : Edit/Write les réécrit en **CRLF** → casse en conteneur Linux. Repasser en LF :
   `sed -i 's/\r$//' scripts/init-rabbitmq.sh`.
9. **Ne jamais activer `SPRINGDOC_ENABLED`** (init mesurée à 81 s → sature le CPU, timeouts).
10. **`git push` échoue depuis l'agent** (proxy TLS) → demander à l'utilisateur : `! git push origin backend/dev`.
11. **Ne conclus pas sans preuve.** Historique : le GED accusé à tort (c'était un symptôme), un OOM supposé
    (le `dmesg` était vide), un bug de code cherché une heure (l'image n'était pas reconstruite).
    **Mesure, puis conclus.**

---

## 🔒 RÈGLES NON NÉGOCIABLES

1. **Aucune donnée mockée, simulée ou codée en dur** dans le livrable. Si une donnée n'existe pas côté
   backend, on **développe l'endpoint** — on n'invente pas de valeur d'affichage.
2. **Corriger à la racine**, jamais masquer le symptôme. **Vérifie dans le code avant d'affirmer** qu'une
   chose est implémentée (le référentiel a déjà sur-affirmé plusieurs fois).
3. **Ne change pas le design ni les workflows du frontend** sans demande explicite.
4. **Git** : tu peux commiter. **Pas de trailer `Co-Authored-By`.** Ne JAMAIS faire `git checkout main`
   depuis `backend/dev` (les branches diffèrent de milliers de fichiers ; un verrou Windows a déjà corrompu
   un checkout en plein milieu).
5. **V5.1 est la source de vérité** : toute divergence constatée → corriger `nexawork-reference-v5.md`.
6. **`IMPLEMENTATION_STATUS.md` à jour** après chaque correction significative.
7. **Ne dis jamais « c'est corrigé » pour ce que tu n'as pas prouvé.** Distingue explicitement :
   *mesuré* / *compilé mais non testé* / *hypothèse*. L'utilisateur veut du fonctionnel, pas du déclaratif.
8. **Division du travail (décidée le 14/07)** : **l'utilisateur construit et teste**, l'agent écrit, compile,
   commite et **indique quoi rebuild**. L'agent ne construit que pour **diagnostiquer**.

---

## ✅ CE QUI EST CORRIGÉ (détail complet en §2bis de IMPLEMENTATION_STATUS.md)

### Lot 1 — canaux, mentions, « Mes tâches » ✅ **déployé** (non retesté)
- **Toast « Ce canal est privé » à son propre créateur** : création optimiste (POST *fire-and-forget* puis
  navigation immédiate) → le guard rechargeait la liste **avant** que le canal existe côté serveur.
- Un **canal de projet naissait canal d'organisation** (`projectId` jamais transmis).
- Le groupe **« Canaux Projets » de la sidebar ne s'affichait jamais** (il cherchait un nom que le payload ne
  porte pas). ⚠️ **Conséquence : les canaux auto `#général`/`#annonces` étaient bien créés** (vérifié en base
  et dans les logs du consumer) mais **invisibles** — le « bug » signalé n'en était pas un.
- **Mentions `@@tâche` non cliquables** : elles portent la **clé** (`MOB-101`), pas l'UUID →
  `TasksService.cardByRef()` résout indifféremment les deux.
- **« Mes tâches »** : sections conformes à V5.1 §5.1 (Aujourd'hui / En retard **seulement**), clé affichée au
  lieu de l'UUID, et la fiche reçoit la **vraie** carte (elle était fabriquée à la main → appel à
  `/projects/undefined/statuses` → 500).

### Lot 2 — WebSocket, présence, réunions ✅ **déployé** (partiellement retesté)
- **WS en 401 permanent** : l'image `api-gateway` datait de **4 jours** — le correctif « `/ws/**` public »
  n'avait jamais été construit. *(Premier cas du piège n°1.)*
- **Aucune identité au handshake** : un WebSocket natif ne peut pas porter `Authorization`, et un chemin
  public saute le filtre JWT → **session STOMP sans Principal** → file privée muette + présence morte.
  → jeton en **query string** (`?access_token=`), validé par le gateway sur `/ws/**`, identité propagée.
- **Réunions** : 409 systématique (l'hôte était compté « déjà en appel » **avant** d'entrer dans la salle, et
  l'appel restait ACTIVE à jamais), blocage sur « Connexion à la salle… » (notre voile masquait l'iframe
  JaaS), invités internes **mock**, page `/guest/{token}` **inexistante**, bannière « Appel en cours » pilotée
  par un signal **local** (donc invisible aux autres participants).

### Lot 3 — mentions rattachées, canaux privés, 400 vs 500 ✅ **déployé**
- **`MessageMention.targetId` jamais renseigné** → « Mentions reçues » **structurellement vide**, aucune
  notification de mention possible. Le Messaging ne peut pas résoudre un nom/une clé (autres domaines) →
  **le client** envoie les cibles résolues ; le parser serveur reste la source de vérité sur *ce qui* est
  mentionné (la requête n'apporte que l'identifiant).
- Nouvel événement **`message.mention`** (le Messaging ne publiait rien) + queue + consumer.
- **Canaux privés : les bénéficiaires n'atteignaient jamais le serveur** (`memberUserIds: []` en dur des deux
  côtés, picker **mock**). Une **équipe est déployée en ses membres** (le Messaging ne stocke que des
  `userId` — il ignore la composition des projets).
- `GET /tasks/{id}` renvoyait **500** sur un id non-UUID → mappé en **400** (commons).

### Lot 4 — 🔴 **ÉCRIT, COMPILÉ, COMMITÉ — PAS ENCORE DANS LES IMAGES**
- **Jitsi « Invalid 'aud' value. It should be 'jitsi' »** : JJWT sérialise `.audience().add()` en **tableau**
  `["jitsi"]`, or JaaS exige la **chaîne** `"jitsi"` → `.audience().single("jitsi")`.
- **Email d'invité externe jamais reçu** : `nexawork-notification.yml` n'avait **pas** le
  `mail.smtp.ssl.trust` que `nexawork-auth.yml` possède → handshake TLS refusé par le proxy
  (« Could not convert socket to TLS »). Le lien invité était pourtant bien généré.
- **L'appel restait `ACTIVE` indéfiniment** : `leave()` ne faisait que marquer le départ du participant → il
  **clôt** désormais l'appel quand plus personne n'est présent (`end()` partage le même code).
- **Clic sur « Appel en cours » sans effet** : `window.open` échouait **en silence** (popup bloqué) → toast.
- **Nom de l'auteur** : le JWT porte `displayName` mais la Gateway ne le propageait **à aucun service** (même
  `caller.displayName()` du meeting retombait sur « Utilisateur ») → en-tête **`X-User-Name`** (URL-encodé :
  un en-tête HTTP n'est pas sûr en UTF-8, « Moussa Bâ » arriverait mutilé) + les 6 `GatewayIdentityFilter`.
- **`There is no underlying STOMP connection`** : `publish()` émettait alors que la connexion s'établit de
  façon **asynchrone** → trames mises en attente et rejouées à `onConnect`.
- **🔑 Vraie cause du « pas de temps réel »** : `subscribeIfPossible()` refusait de réabonner une destination
  déjà présente dans `subs`. Or **les abonnements meurent avec la socket** : après une coupure ils n'étaient
  **jamais** réarmés → le fil devenait muet jusqu'au rechargement de la page. `subs` est désormais vidée à
  `onWebSocketClose`.
- **Présence : hors ligne immédiat** → le Notification Service diffuse les connexions/déconnexions sur
  **`/topic/presence`** ; le sondage de 20 s ne sert plus que de rattrapage.
- **Notification de mention** : porte le **nom de l'auteur** et un lien **ancré sur le message**
  (`?message=<uuid>`) — la vue ouvre le canal/la conversation, y défile et **encadre** le message.

---

### Lot 5 — temps réel : présence, saisie, accusés de lecture ✅ **commité** (non rebuild / non retesté)
- **Import de fichier 500** : le `file-service` n'avait **aucune auto-création de bucket** MinIO (il dépendait
  d'un sidecar `minio-init` oublié) → `BucketInitializer` (`@PostConstruct`) + `ensureBucket()` dans `upload()`.
- **Dossier restreint : `TypeError: Cannot read properties of null (reading 'map')`** : le GED renvoyait
  `taskAttachments = null` (jamais initialisé) → `.taskAttachments(List.of())` côté serveur + `?? []` défensif
  côté `ged.service.ts`.
- **« Mes tâches » (Accueil)** : deux sections « Prioritaires » (échéance ≤ aujourd'hui) / « Mes autres tâches ».
- **Présence pas en temps réel dans le profil/l'en-tête** : `MembersService.byName`/`bySlug` figeaient la
  présence à l'ouverture → recombinés avec le flux `presence$` (`combineLatest`) → suivent connexions/déco.
- **« En train d'écrire » invisible** : le typing était **masqué** par un couplage à la présence
  (`peerTyping = typingRaw && peer.online`) → **découplé** (`peerTyping = typingRaw`).
- **🔑 Accusé de lecture (« lu ») jamais affiché** (`2642040`) : le front appelait `markRead(slug)` qui
  **n'effaçait que le badge local** — le **vrai** `PATCH /messages/{id}/read` **n'était jamais émis**, donc
  `readAt` restait `null`. Correctif : (a) `ConversationServiceImpl.markRead` **rediffuse** le message (avec
  `readAt`) sur le topic → l'expéditeur voit « lu » sans recharger ; (b) nouvelle méthode front
  `markMessageRead(id)` qui émet le PATCH réel, appelée à la réception live d'un message du pair **et** à
  l'ouverture pour les messages reçus pendant l'absence (dédup par `Set`, serveur idempotent) ; (c) réception
  live restructurée en 3 cas (MAJ par id / réconciliation de l'optimiste sans id / nouveau message du pair).

## ❓ EN ATTENTE DE VÉRIFICATION PAR L'UTILISATEUR

- **Les 500 (`/users/me`, `/workspaces`, `/members`) et les 401 associés.** Hypothèse forte : **pas un bug de
  code** — PostgreSQL décrochait sous la pression mémoire d'un build (piège n°2). **À retester stack au
  repos, sans build en cours.** Si ça persiste à froid → vrai bug, creuser.
- **Le 504 à la création de réunion.** La réunion **était bien créée** côté serveur (logs) — timeout client
  sur JVM froide. À revérifier à chaud ; si récurrent, monter le timeout.
- **La salle JaaS s'ouvre-t-elle vraiment ?** Jamais exercée (exige caméra + navigateur). L'erreur `aud` est
  corrigée, mais rien ne prouve qu'il n'y en a pas une autre derrière. **Autoriser les popups.**
- **Temps réel** (message instantané, « en train d'écrire », présence) : exige **deux comptes connectés**.

## 🔮 JAMAIS EXERCÉ DU TOUT
- **Rapports PDF** (OpenPDF, `project-service`) : le code existe, personne n'a jamais cliqué sur le bouton.
  Dernier morceau du périmètre livrable totalement non testé.
- **Recherche globale** : renvoyait 0 résultat lors d'un test ancien. Les erreurs backend sont avalées par un
  `catchError` dans `search.service.ts` → **le retirer temporairement** pour voir la vraie erreur.

---

## 🚦 DÉMARRAGE

1. **Reprends d'abord la « TÂCHE EN COURS » ci-dessus** (pédagogie WebSocket + revue du schéma `figure4_1`).
   Demande à l'utilisateur de te **re-joindre l'image** `figure4_1.png` (elle était dans ses Téléchargements) si
   tu dois l'analyser. Les faits WebSocket sont déjà vérifiés dans le code — inutile de re-fouiller, mais tu
   **peux** citer les fichiers (`nexawork-frontend/nginx.conf`, `nexawork-gateway.yml`, `stomp-client.service.ts`).
2. Lis les fichiers de référence (§ « PREMIÈRE ACTION »).
3. `git status` (propre) + `git log --oneline -14` ; commits à pousser → demande à l'utilisateur
   (`! git push origin backend/dev`). `docker compose ps` pour l'état réel.
4. **Rebuild + test** : le lot 5 (temps réel) est commité mais **pas rebuild**. Front + `messaging-service` au
   minimum. Le temps réel exige **deux comptes connectés**.
5. Corrige méthodiquement : **mesurer → localiser → corriger à la racine → compiler → commiter → indiquer
   quoi rebuild**.
