# NexaWork — Reprise de session (phase de correction post-tests)

> **Copie-colle ce fichier entier comme premier message à une nouvelle instance Claude Code.**
> Il est autosuffisant : l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.
>
> **Dernière mise à jour : 2026-07-14 (nuit — session « mentions, canaux privés, WebSocket, réunions »).**

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

## 🟢 ÉTAT À LA REPRISE — le lot 4 est DÉPLOYÉ, il reste à le TESTER

**Lot 4 (JaaS `aud`, email invité, temps réel, nom de l'auteur) : construit, déployé et vérifié dans les jars
le 2026-07-14.** Stack au repos mesurée saine (8 connexions PostgreSQL, aucune erreur récente).
**Il n'y a aucun build en attente.** Détail complet en §2bis d'`IMPLEMENTATION_STATUS.md` (points #22 à #30).

**Ce qu'il reste : la validation en navigateur — rien de ce lot n'a encore été exercé.** Voir « EN ATTENTE DE
VÉRIFICATION » plus bas. Priorités : la **salle JaaS s'ouvre-t-elle vraiment** (autoriser les popups), le
**temps réel** (exige **deux comptes connectés**), l'**email d'invité externe**.

> ⚠️ **Leçon du lot 4** : `api-gateway` faisait partie du lot (il pose `X-User-Name`) mais **manquait à la
> liste de rebuild** annoncée. **Un correctif transverse — Gateway, `commons` — touche des services qu'on
> n'a pas en tête : dresser la liste depuis les fichiers modifiés, pas de mémoire.**

**Modèle de vérification d'un build** (piège n°1 — à refaire à chaque lot, avec le **vrai** chemin de la classe :
`git log --stat` donne le package exact ; un chemin faux rend `0` et fait croire à un échec) :
```bash
docker run --rm --entrypoint sh nexawork-meeting-service -c \
  "unzip -p /app/app.jar BOOT-INF/classes/com/nexawork/meeting/security/GatewayIdentityFilter.class | strings | grep -c X-User-Name"
# doit afficher 1 — si 0, le build a échoué EN SILENCE
```

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

1. Lis les fichiers de référence ci-dessus.
2. `git status` (commits à pousser — demande à l'utilisateur) et `docker compose ps`.
3. **Fais construire et déployer le lot 4** (commandes en haut), **vérifie les jars**, puis demande à
   l'utilisateur de tester.
4. Corrige méthodiquement : **mesurer → localiser → corriger à la racine → compiler → commiter → indiquer
   quoi rebuild**.
