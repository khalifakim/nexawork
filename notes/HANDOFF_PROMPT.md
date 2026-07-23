# NexaWork — Reprise de session (PRÉ-SOUTENANCE : gel des fonctionnalités)

> **Copie-colle ce fichier entier comme premier message à une nouvelle instance Claude Code.**
> Il est autosuffisant. **Dernière mise à jour : 2026-07-24** (session correctifs post-tests + décision « vue Calendrier »).

---

## 🎯 Mission & contexte

Tu reprends le développement de **NexaWork** — plateforme collaborative unifiée (gestion de projets +
messagerie + GED + visioconférence), sujet de **mémoire de Master 2 SIR (UCAD)**. **Réponds toujours en français.**

- **Backend** : 9 microservices Spring Boot 3.5 / Java 21. **Frontend** : Angular 20. Tout tourne en **Docker**.
- **Dépôts** (branche `main` pour les deux) :
  - Code : `D:\memoire-master\nexawork`
  - Docs : `D:\memoire-master\docs-config` — le **mémoire LaTeX** est dans
    `docs-config/memoire/redaction/redaction-latex` (`main.tex`, `chapitres/`).
- **SOUTENANCE : 28 juillet 2026** (dans ~2-4 jours).
- **Phase actuelle : GEL DES FONCTIONNALITÉS + stabilisation.** L'utilisateur teste dans le navigateur,
  signale les bugs, tu corriges **à la racine** et **minimalement**.

---

## 🔴 LES DEUX RÈGLES QUI PRIMENT SUR TOUT

### 1. Stabilité avant tout
À quelques jours de la soutenance, **toute nouveauté risque un bug pendant la démo**. On corrige les bugs,
on **n'ajoute pas** de fonctionnalité — sauf décision **explicite** de l'utilisateur. Quand tu corriges :
service concerné uniquement, changement minimal, compile + build + vérifie.

### 2. Cohérence avec le mémoire (TRÈS IMPORTANT)
Le jury **lit le mémoire** ET **regarde la démo**. La conclusion du mémoire liste explicitement des choses
comme **PERSPECTIVES (non implémentées)** — les implémenter créerait une **contradiction**.

**Explicitement « non fait » (perspectives) dans `chapitres/conclusion.tex` :**
- Planification des réunions + rappels + **« vue d'agenda »**
- **Analytique avancée des tableaux de bord** (profondeur temporelle, tendances, vélocité, projections)
- Enregistrement des réunions · Application mobile
- Intégrations tierces (**synchronisation avec les calendriers d'entreprise**, API publique, webhooks)
- Bascule vers Jitsi auto-hébergé · Industrialisation infra (cluster RabbitMQ, Kubernetes, séparation des bases)
- **Génération de comptes-rendus par IA**

**Limitations assumées (donc « non fait ») :** recherche sans moteur d'indexation · notifications non
personnalisables · conversations directes limitées à 2 participants · **GED sans édition collaborative** ·
dépendance au cloud visio.

➡️ **NE PAS implémenter ces éléments avant la soutenance.** Ils se **présentent** en Perspectives (c'est un atout).

---

## 📌 SUJET EN COURS — Vue **Calendrier** projet (DÉCISION EN ATTENTE)

L'utilisateur veut ajouter une **vue Calendrier** aux projets, **à côté de Kanban et Gantt**. Analyse déjà faite :

**Faisabilité : OUI, et c'est l'ajout le moins risqué possible.**
- `projet-shell.component.ts` a un tableau `tabs: Tab[]` (~ligne 229) + un `@switch (tab())` (~ligne 111)
  qui rend `<app-kanban>`, `<app-gantt>`, etc. Les routes sont `/app/projets/:id/:tab`.
- Ajout = (1) une entrée `{ key: 'calendrier', label: 'Calendrier', icon: 'calendar' }` dans `tabs`,
  (2) un `@case ('calendrier')`, (3) un composant `projet-calendrier` qui **réutilise les tâches déjà chargées**
  (`KanbanStore` — mêmes données que Kanban/Gantt) et les place sur une **grille mensuelle** par échéance.
- **Frontend seul** (zéro backend, zéro migration), **additif** (ne touche pas Kanban/Gantt → blast radius confiné),
  **sans nouvelle dépendance** (grille mois maison, pas de FullCalendar → pas de risque CSP/build).

**Cohérence mémoire : défendable.** La perspective « vue d'agenda » du mémoire concerne la **planification des
réunions**, pas les **tâches**. Une vue calendrier **des tâches d'un projet** est un **mode d'affichage** au même
titre que Kanban/Gantt.
⚠️ **À l'oral, la présenter comme « un 3ᵉ mode de visualisation des tâches » (Kanban / Gantt / Calendrier)**, jamais
comme « l'agenda » — pour éviter toute ambiguïté avec la perspective réunions.

**⛔ Ce qui a été REFUSÉ (et pourquoi) :**
- **Filtrage par période du tableau de bord** → c'est **exactement** la perspective « analytique avancée des
  tableaux de bord (profondeur temporelle) » du mémoire → **contradiction** + modif d'une vue existante qui marche.
- Automatisations poussées, rôles personnalisés, édition de documents → **perspectives explicites** du mémoire.

**État de la décision** : l'assistant a proposé de le construire ; **l'utilisateur n'a pas encore dit « go »**.
Si l'utilisateur confirme → construire l'onglet Calendrier proprement, tester, déployer. Sinon → backlog.

---

## ✅ État actuel : TOUT est déployé, sain, commité et poussé

- **14/14 conteneurs `healthy`**, frontend HTTP 200.
- **Derniers commits poussés** : `nexawork` → **`b99b5ec`** · `docs-config` → **`685ef06`**.
- **Seule modif non commitée** : une ligne ajoutée au backlog (`notes/AMELIORATIONS_FUTURES.md`) sur le
  filtrage par période du tableau de bord.
- **URLs de test** : `http://localhost:4200` — et depuis une autre machine du LAN : `http://192.168.1.29:4200`.

---

## 🛠️ Correctifs livrés dans les sessions récentes (tous déployés + poussés)

- **Statut de tâche obligatoire** (entité `optional=false`, statut initial par défaut, suppression d'une colonne
  non vide refusée 409) + **migration `V7__task_status_mandatory.sql`** (⚠️ renommée depuis V3 : collision Flyway).
- **Recherche** : fix **500** (LazyInit sur `t.status` puis sur `f.folder` côté GED) + **`q` vide → top N par domaine**
  (project/ged/messaging/auth) + l'overlay interroge le back **dès l'ouverture** (le debounce 250 ms existait déjà).
- **Notifications** : filtre par type (`GET /notifications?type=A,B`) + page **`/app/accueil/notifications`**
  (même présentation que « Mentions reçues » : pleine largeur, onglets soulignés, pagination) + entrée sidebar
  + bouton « Voir toutes les notifications » dans le popup cloche. **Onglet « Mention » retiré**
  (les mentions ont leur page dédiée) et **mentions retirées de la cloche** (`MessageAssembler.notifyMentioned` neutralisé).
- **Accueil** : **bandeau « Alertes »** (en retard + échéances proches ≤ 3 j, personnel, front seul) +
  **« Mes tâches » en liste plate** (l'urgence est passée dans le bandeau). Doc V5.1 §5.1 mise à jour.
- **🔑 Sérialisation des dates** : `commons/ObjectMapperConfiguration` ne désactivait pas
  `WRITE_DATES_AS_TIMESTAMPS` → `LocalDate` partait en **tableau `[2026,7,17]`** au lieu de `"2026-07-17"`.
  Corrigé (`disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)`) — **ça réglait 3 bugs d'un coup** :
  « Invalid Date », bandeau Alertes qui ne s'affichait pas, dates vides à l'édition d'une tâche.
- **Tâches d'équipe** : `findAssignedTo` inclut désormais les tâches assignées à une **équipe dont je suis membre**.
- **Rafraîchissement** : « Mes tâches » se re-fetch après édition d'une tâche (événement `(updated)` de la fiche).
- **GED** : **dates exactes** (« 17 juil. 2026 ») au lieu de « Cette semaine » ; le filtre « Date » utilise
  désormais une **date brute** (`rawDate`) au lieu de comparer des libellés.
- **Présence** : la **WebSocket est coupée au logout** (`StompClientService.disconnect()` appelé par
  `SessionService.logout()`) → l'utilisateur passe **hors ligne immédiatement** côté des autres (avant, il fallait
  fermer la fenêtre).
- **RabbitMQ** : CPU **151 % → ~0,5 %** (drapeaux Erlang `+sbwt none +sbwtdcpu none +sbwtdio none` dans
  `docker-compose.yml`) + **fix CRLF de `scripts/init-rabbitmq.sh`** (le script était cassé → les files n'étaient
  jamais créées par le sidecar ; elles sont désormais recréées **ET durables**).
- **Multi-machines** : `CORS_ORIGINS=*`, `FRONTEND_BASE_URL=http://192.168.1.29:4200` (liens email), frontend publié
  sur `0.0.0.0:4200`.
- **Visio JaaS** : l'erreur `conference.connectionError.notAllowed` venait d'une **paire de clés désynchronisée**
  (clé publique console 8x8 ≠ clé privée `.env`). **Résolu** en régénérant une paire propre des deux côtés.
  ⚠️ Les clés JaaS **n'expirent pas** ; si ça recasse, c'est que les deux côtés ne correspondent plus.

---

## 📋 Backlog (à reprendre APRÈS la soutenance)

Tout est dans **`notes/AMELIORATIONS_FUTURES.md`** : dépendances typées entre tâches, epics/hiérarchie, sprints,
modèles de méthodologie, validateurs + post-fonctions de workflow, automatisations (moteur de règles), hub 360° de
la tâche, IA contextuelle, rôles personnalisés, édition de documents, **calendrier & vues multiples**, filtrage par
période du tableau de bord, quick wins — avec un **ordre de reprise** et une **note de cohérence mémoire**.

---

## ⚠️ PIÈGES D'ENVIRONNEMENT (déjà payés — ne pas les repayer)

1. **Après CHAQUE redéploiement du frontend → `Ctrl+Shift+R`.** Angular renomme ses chunks à chaque build ;
   un onglet resté ouvert cherche d'anciens fichiers → `Failed to fetch dynamically imported module` et
   « rien ne se passe ». Ce n'est **pas** un bug.
2. **`docker compose build` peut échouer EN SILENCE (exit 0)** à cause d'un proxy TLS. **Vérifier le jar** :
   `docker run --rm --entrypoint sh nexawork-<svc> -c "unzip -p /app/app.jar BOOT-INF/classes/<chemin>.class | strings | grep -c <motif>"` → doit afficher ≥ 1.
3. **Scripts `.sh` : Edit/Write les réécrit en CRLF** → cassés en conteneur Linux. Repasser en LF :
   `sed -i 's/\r$//' scripts/init-rabbitmq.sh`.
4. **Machine contrainte (8 Go / 4 cœurs)** : démarrer les services **un par un** (attendre `Started …Application`),
   sinon ils ressortent tous `unhealthy` à tort. **Ne jamais tester pendant un build.**
5. **Maven** : utiliser **JDK 21** →
   `JAVA_HOME="/c/Program Files/Java/jdk-21" mvn -o -q -pl nexawork-<svc> -am compile`.
6. **`api-gateway` a un `depends_on` sur tout** → toujours `--no-deps` pour recréer un service.
7. **Migrations Flyway** : ne JAMAIS modifier une migration déjà appliquée ; vérifier qu'un **numéro de version
   n'est pas déjà pris** (une collision V3 a failli empêcher `project-service` de démarrer).
8. **Git** : commits **sans trailer `Co-Authored-By`**. Les deux dépôts sont sur `main`, le push fonctionne
   depuis l'agent.
9. **Présence** : se teste avec **deux comptes DIFFÉRENTS** sur deux navigateurs (avec le même compte dans deux
   onglets, se déconnecter d'un onglet ne met pas hors ligne).

---

## 🚦 Démarrage

1. Lis **`notes/AMELIORATIONS_FUTURES.md`** (backlog + note de cohérence) et **`notes/IMPLEMENTATION_STATUS.md`**
   (§2bis = journal détaillé des correctifs : symptôme → cause racine → correctif).
2. Vérifie l'état réel : `git log --oneline -5`, `git status`, `docker compose ps`.
3. **Attends que l'utilisateur signale un bug ou tranche la décision « vue Calendrier »**, puis agis :
   **mesurer → localiser → corriger à la racine → compiler → build → déployer → vérifier**.
4. **Ne conclus jamais sans preuve.** Distingue explicitement : *mesuré* / *compilé mais non testé* / *hypothèse*.
5. **N'ajoute aucune fonctionnalité** de ta propre initiative — rappelle les deux règles ci-dessus si besoin.
