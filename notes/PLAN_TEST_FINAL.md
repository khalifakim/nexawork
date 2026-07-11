# NexaWork — Plan de test final (intégration frontend ↔ backend)

> Généré après l'achèvement des **14 phases** d'intégration (I0→I10 + bloc Meetings).
> Objectif : valider en conditions réelles tout le code écrit « en aveugle » pendant le
> sprint, et corriger d'un bloc. **Machine 8 Go — on ne lance que le nécessaire.**

---

## 0 · Avant de commencer — les 2 zones à risque

Pendant tout le sprint, `ng build` a garanti la **compilation du frontend**, mais deux
familles de code **n'ont jamais été exécutées** :

1. **Backend neuf (première compilation Java au `docker compose build`)** :
   - `project-service` : `/users/me/tasks` (I7), recherche `/search` (I9), **OpenPDF** rapports (I10),
     migrations **V3** (comment_attachments) et **V4** (project_role).
   - `messaging-service` : `MentionResponse` enrichi (I7), recherche `/search` (I9).
   - `ged-service` : recherche `/search` (I9).
   - `auth-service` : recherche `/search` + `SearchRule` (I9).
   - `meeting-service` : entité **MeetingMessage** + chat (M2), `lobby_bypass` (M3).
   👉 **Risque n°1** : une erreur de compilation Java bloque le démarrage du service concerné.

2. **Temps réel / externe (exerçable seulement à l'exécution)** :
   - STOMP : canaux, conversations (I4), notifications + présence (I6).
   - IFrame JaaS (M4) : exige la **vraie clé JaaS** configurée.

**Rebuilds obligatoires** (schéma/dépendance/code Java modifiés) :
`project-service`, `messaging-service`, `ged-service`, `auth-service`, `meeting-service`, `notification-service`, `frontend`.

---

## 1 · Séquence de démarrage (ménage les 8 Go)

> ⚠️ Rappels environnement : **ne jamais activer `SPRINGDOC_ENABLED`** (init 81 s → timeouts).
> `api-gateway` a un `depends_on` sur tout → **toujours `--no-deps`**. Tester **uniquement via
> http://localhost:4200**. Couper `config-server` une fois tout `healthy` libère un cœur.

### Étape A — Infra (toujours nécessaire)
```bash
cd D:/memoire-master
docker compose up -d postgres redis rabbitmq minio
docker compose up -d minio-init rabbitmq-init
docker compose up -d config-server
docker compose ps          # attendre postgres/redis/rabbitmq/minio healthy
```

### Étape B — Rebuild de tout le backend modifié (⚠️ tu lances, ~long au 1er build)
```bash
docker compose build auth-service project-service messaging-service ged-service meeting-service notification-service file-service
docker compose build frontend
```
> **Surveiller le build `project-service`** : c'est lui qui télécharge **OpenPDF** (1re dépendance
> Maven ajoutée) et compile le plus de code neuf. Si un build Java échoue → me copier l'erreur.

### Étape C — Démarrage progressif par domaine à tester
Ne démarre que les services de la phase que tu testes (voir §2). Base minimale commune :
```bash
docker compose up -d --no-deps --force-recreate auth-service
docker compose up -d --no-deps --force-recreate api-gateway
docker compose up -d --no-deps --force-recreate frontend
```
Puis ajoute au fur et à mesure : `project-service`, `file-service`, `ged-service`,
`messaging-service`, `notification-service`, `meeting-service`.

### Étape D — Vérifier les migrations neuves (le point le plus à risque)
```bash
docker compose logs project-service | grep -iE "V3|V4|comment_attachments|project_role|Flyway|Migrating|Started"
docker exec nexawork-postgres psql -U postgres -d nexawork_project_db -c "\d comment_attachments"
docker exec nexawork-postgres psql -U postgres -d nexawork_project_db -c "SELECT DISTINCT project_role FROM project_members;"
docker compose logs meeting-service | grep -iE "meeting_messages|Started|ERROR"
```
- `comment_attachments` doit exister (V3) ; `project_role` doit être `PROJECT_LEAD`/`PROJECT_MEMBER` (V4).

---

## 2 · Checklist de validation — phase par phase

> Se connecter avec le compte **OWNER** (admin). Tester chaque case ; noter ce qui casse.
> Services requis indiqués par phase. Tout se teste sur **http://localhost:4200**.

### ✅ I1 · Auth & Workspace  *(auth, gateway, frontend)*  — déjà validé, contrôle de non-régression
- [ ] Login → entrée dans le workspace ; header affiche nom + couleur.

### ✅ I2 · Projets + Kanban  *(+ project-service)*
- [ ] Créer un projet → apparaît en sidebar, board avec 4 colonnes seedées.
- [ ] Créer une tâche → `taskKey` (PREFIX-N) sur la carte.
- [ ] **Drag** une carte → toast « déplacée vers … » ; transition interdite → **422 + toast**, la carte revient.
- [ ] Fiche tâche : éditer titre/desc, sous-tâches, **commentaire + fichier joint** (teste file-service/minio + `comment_attachments`), pièce jointe de tâche, supprimer.
- [ ] Menu ⋯ → **Statuts** : renommer/couleur/ajouter/supprimer/réordonner → **recharger** = persistant.
- [ ] **Workflow** : réordonner, « Imposer l'ordre », responsable « Chef de projet », Enregistrer → persistant.
- [ ] **Vue d'ensemble** + **Gantt** cohérents. Archiver / restaurer / supprimer un projet.
> Requiert : `project-service`, `file-service`, `minio`.

### ✅ I3 · Members  *(+ auth, notification pour la présence)*
- [ ] Annuaire (Équipes, Conversations) affiche les **vrais** membres.
- [ ] « En ligne » : ouvrir un 2e navigateur/onglet connecté → il apparaît en ligne (présence Redis via notification-service).

### ✅ I4 · Canaux + Conversations (STOMP)  *(+ messaging-service)*
- [ ] Ouvrir un canal → historique réel. **Envoyer un message** → apparaît.
- [ ] **Temps réel** : 2e client sur le même canal → le message arrive **sans recharger**.
- [ ] Conversation directe : envoyer, accusé de lecture (✓✓).
- [ ] Canal privé : invisible pour un non-membre ; accès direct par URL → redirigé.
> ⚠️ *PJ de message différées (dépendance messageId) — attendu, ne pas tester l'upload en message.*

### ✅ I5 · GED / Documents  *(+ ged-service, file-service, minio)*
- [ ] Arborescence réelle. **Créer un dossier**, **importer un fichier** (vrai sélecteur → MinIO).
- [ ] Renommer, supprimer → **Corbeille** ; restaurer ; vider.
- [ ] **Versions** : importer une nouvelle version, restaurer.
- [ ] **Gérer les accès** : passer un document en privé/partagé, ajouter un membre / une équipe (R16 : sur un doc de projet, seuls les membres du projet sont proposés). Recharger → cadenas cohérent.
- [ ] `Mes documents` / `Partagés avec moi` réels.
- [ ] **Photo de profil** (Paramètres ▸ Profil) : changer → l'avatar se met à jour (upload avatar).
> REF G : un document restreint créé par un autre n'apparaît pas pour un non-bénéficiaire.

### ✅ I6 · Notifications (STOMP + Web Push)  *(+ notification-service)*
- [ ] Déclencher un événement (ex. être ajouté à un projet, mention) → **cloche** se met à jour **en temps réel**.
- [ ] Marquer lu / cliquer une notif → navigation correcte, persistance.
- [ ] **Web Push** : autoriser les notifications navigateur → fermer l'onglet → déclencher un événement → notification système reçue (HTTPS/localhost requis).

### ✅ I7 · Accueil / Dashboard  *(+ project-service, messaging)*
- [ ] **Tableau de bord** (admin) : KPIs, projets, charge, alertes cohérents. Non-admin → route bloquée (adminGuard).
- [ ] **Mes tâches** : liste réelle des tâches qui me sont assignées, groupées par échéance.
- [ ] **Mentions reçues** : auteur, extrait, contexte affichés.

### ✅ I9 · Recherche globale  *(TOUS : project, ged, messaging, auth)*
- [ ] Loupe (ou Ctrl/⌘+K) → taper un mot-clé → résultats **mêlés** (tâche par taskKey, projet, document, canal, message, personne).
- [ ] **REF F/G** : un canal privé / document restreint dont je ne suis pas membre **n'apparaît PAS**.
- [ ] Filtres par type (chips) ; clic → navigation correcte.

### ✅ I10 · Rapports PDF  *(+ project-service, OpenPDF)*
- [ ] Vue d'ensemble projet → **Générer un rapport** → un **vrai PDF** se télécharge (KPIs, statuts, tableau des tâches).
- [ ] Tableau de bord → **Générer un rapport** → PDF global (projets, charge, alertes).
- [ ] Non-autorisé → 403.

### ✅ I8 / M4 / M2 / M3 · Meetings  *(+ meeting-service, clé JaaS)*
- [ ] **Lancer une réunion** → salle plein écran s'ouvre (IFrame JaaS). *(Nécessite `JAAS_APP_ID`/clé réels.)*
- [ ] Quitter (`readyToClose`) → retour historique, pastille header se coupe.
- [ ] **Chat (M2)** : échanger des messages en réunion → **persistés** → relisibles après l'appel.
- [ ] **Lobby (M3)** : invité externe (lien) → salle d'attente ; membre non convié → salle d'attente ; hôte / membre convié → entrée directe.
- [ ] `GET /calls/active` : membre convié voit le bandeau « Réunion en cours » ; membre **non convié** ne voit **rien**.
> ⚠️ *Si la clé JaaS n'est pas configurée : la salle affichera une erreur — c'est attendu, tester le reste (création, historique, chat via API).*

---

## 3 · Réinitialiser des données de test

```bash
# Repartir de zéro sur les projets (garde l'auth) :
docker exec nexawork-postgres psql -U postgres -d nexawork_project_db -c "TRUNCATE projects, workflow_statuses, workflow_transitions, tasks, sub_tasks, task_comments, comment_attachments, task_attachments, project_members, teams CASCADE;"
```

---

## 4 · En cas de problème — quoi me copier

- **Un service ne démarre pas** → `docker compose logs <service> | tail -50` (surtout Flyway / stacktrace Java).
- **Toast « serveur ne répond pas »** → d'abord vérifier que `SPRINGDOC_ENABLED` n'est **pas** activé.
- **Un flux front échoue** → la console navigateur (F12) + l'onglet Réseau (statut HTTP de l'appel).
- **STOMP muet** → vérifier la connexion WebSocket dans l'onglet Réseau (frames `/ws/messaging`, `/ws/notifications`).

Note tout ce qui casse (phase + symptôme) ; on corrigera **par lots** ensuite.
