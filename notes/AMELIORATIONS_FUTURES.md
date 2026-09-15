# NexaWork — Améliorations futures (backlog post-soutenance)

> Idées de fonctionnalités différenciantes discutées avant la soutenance.
> **À NE PAS implémenter avant la soutenance** (2026-07-28) : priorité à la stabilité
> et à la démonstration de l'existant. À reprendre ensuite.
>
> Fil conducteur : **ne pas devenir Jira/Teams — devenir la couche INTÉGRÉE qu'ils n'ont pas.**
> Les meilleures fonctions exploitent le graphe unifié (tâches ↔ messages ↔ docs ↔ réunions)
> et sont *structurellement impossibles* pour une juxtaposition d'outils cloisonnés.

---

## 1. Gestion de projet — combler les manques vs Jira

### 1.1 Dépendances typées entre tâches ⭐ (fort / effort moyen)
Entité `TaskLink { fromTaskId, toTaskId, type ∈ {BLOCKS, RELATES_TO, DUPLICATES} }` (inverse déduit).
Endpoints : `POST/GET/DELETE /tasks/{id}/links`. Garde anti-cycle.
Débloque : blocage de transition (pas de bloqueur ouvert), notif de déblocage, flèches Gantt, badge « 🔒 bloquée ».

### 1.2 Epics & hiérarchie ⭐
Type d'issue + niveau au-dessus de la tâche (Epic → Task/Bug → SubTask). Avancement de l'Epic dérivé de ses tâches.

### 1.3 Sprints / Agile
Entité `Sprint { nom, objectif, dateDébut, dateFin, statut, projectId }` + `Task.sprintId`.
Backlog ↔ planification, tableau du sprint actif, points d'effort (passer `estimate` en numérique),
burndown + vélocité, clôture (tâches non finies → backlog/sprint suivant).

### 1.4 Modèles de méthodologie (effort faible, gros effet démo)
Presets sélectionnables à la création (le `WorkflowSeeder` existe déjà) : Kanban simple, Scrum (+ sprints),
Dév logiciel, Support/tickets (+ SLA). Champ `Project.methodology`.

### 1.5 Étiquettes + filtres/vues sauvegardés
Labels sur les tâches, filtres avancés, vues sauvegardées (équivalent léger de JQL).

### 1.6 Divers Jira
Champ `resolution` (≠ statut), opérations en masse (bulk edit), suiveurs (watchers) d'une tâche,
journal d'activité complet par tâche.

---

## 2. Suivi du temps — différenciateur = automatique/passif
Aujourd'hui `estimate` = simple texte, aucun calcul. Les autres (Jira, Toggl) = worklog **manuel** (jamais rempli).
**Notre plus** : temps **pré-rempli** depuis le contexte intégré — temps de réunion rattachée à la tâche,
temps fiche ouverte/active, activité sur docs liés → l'utilisateur ajuste au lieu de saisir.
Alimente charge réelle par personne, temps par projet (facturation). Garder le worklog manuel en repli.

---

## 3. Workflow configurable — le passer de « colonnes » à « moteur »
Jira = machine à états avec, par transition : conditions (✅ on a rôle/ordre) + **validateurs** (❌) + **post-fonctions** (❌).
- **Validateurs** (bloquent le passage) : commentaire de résolution requis, toutes sous-tâches cochées,
  aucune dépendance bloquante ouverte, champs requis.
- **Post-fonctions** (actions après transition) : auto-assigner, poser échéance/SLA, notifier un canal,
  créer une checklist, mettre à jour l'Epic.
C'est le meilleur levier PM : réutilise `WorkflowTransition` (`responsibleUserId`, `enforceWorkflowOrder`).

---

## 4. Automatisations « Quand → Si → Alors » (no-code)
**Bien placé** : bus RabbitMQ (events tâche) + moteur workflow + pipeline notifs déjà là. Nos actions peuvent
être **transverses** (canal, GED, réunion) — ce que Jira ne fait pas.

- **Phase 1 (rapide)** : quelques règles codées en dur + job `@Scheduled` : rappels/échéance/escalade,
  auto-assign à la revue (SLA), sous-tâches cochées → En revue, tâches récurrentes.
- **Phase 2** : moteur générique
  `AutomationRule { projectId, trigger, conditions[], actions[], enabled }` + écran « Automatisations »
  par projet (constructeur en menus) + **recettes** activables en 1 clic + règles **système** (rappels).
- Configuré par le **chef de projet** (une règle affecte tout le projet). L'utilisateur compose à partir
  de la **palette de triggers/conditions/actions** qu'on expose.

Exemples : tâche → Terminé ⇒ notifier #canal + archiver docs GED ; priorité URGENT ⇒ prévenir le chef ;
échéance dépassée +2 j ⇒ escalade ; bloqueur terminé ⇒ notifier « débloqué ».

---

## 5. Hub 360° de la tâche ⭐⭐ (LA matérialisation de la thèse)
On a déjà l'intégration au niveau **conteneur** (créer un projet ⇒ canaux + espace GED auto ; archive/suppr propagée).
**Manque** : le panneau qui agrège, **autour d'une tâche précise**, tout ce qui la concerne — messages qui la
mentionnent, docs liés, réunion(s) où elle a été évoquée + décisions, dépendances, journal d'activité.
= agrégation **cross-service** (messaging + GED + meeting rappellent un `taskId`). Le lien réunion↔tâche manque.

---

## 6. IA contextuelle (cerise, exploite le graphe)
- Résumé auto de réunion → **création des tâches d'action**.
- Cmd+K en **langage naturel** (« crée une tâche pour Fatou vendredi dans le projet X »).
- **Recherche sémantique (RAG)** au lieu du `LIKE` actuel.
- « Résume l'avancement », « quelles tâches bloquées et pourquoi (d'après les échanges) ».

---

## 7. Manques vs outils matures (par module) + ce qu'on ferait MIEUX

**Messagerie vs Teams/Slack** — manquent : threads, réactions emoji, épingler/messages enregistrés,
édition/suppression, formatage riche (markdown/blocs de code), aperçu de liens, messages programmés,
recherche dans un canal, vocal/huddle.
→ **Mieux** : convertir un **message en tâche** en 1 clic ; le message reste lié au projet/à la tâche.

**GED vs SharePoint/Drive** — manquent : **co-édition temps réel** (Google Docs), aperçu en ligne (PDF/Office/images),
**recherche plein-texte dans le contenu** (pas que le nom), commentaires/annotations, **pages wiki** (pas que des
fichiers), liens de partage publics/expirables.
→ **Mieux** : un doc **connaît** son projet/sa tâche ; docs qui **embarquent des tâches live**.

**Réunions vs Zoom/Teams/Meet** — manquent : **planification + invitations calendrier**, **agenda + notes
collaboratives + tâches d'action**, réunions récurrentes, sondages/lever la main. (Enregistrement/transcription
volontairement exclus — coût JaaS.)
→ **Mieux** : la réunion **produit des tâches** rattachées au projet et persiste décisions + fichiers.

---

## 8. Quick wins (fort ratio impact/effort)
- **Command palette Cmd+K « actions »** (étendre la recherche existante : créer tâche, changer statut, lancer réunion…).
- Statuts de **présence riches** (« en réunion », « focus ») — présence Redis déjà là.
- **Digest** quotidien/hebdo par projet.
- **Modèles** (templates) de projets/tâches/canaux.

---

## 9. Rôles personnalisés (permissions granulaires)
Aujourd'hui : rôles **fixes** (workspace : OWNER/ADMIN/MEMBER ; projet : PROJECT_LEAD/PROJECT_MEMBER), vérifiés **en dur**.
Cible : passer à un modèle à **permissions**.
- Entité `Role { name, permissions[] }` + **catalogue de permissions granulaires** (create_task, delete_project,
  manage_members, manage_workflow, manage_ged…). Rôles **composables**, assignés aux utilisateurs.
- Les gardes vérifient une **permission** au lieu d'un rôle codé en dur.
- ⚠️ **Refonte** de la couche de permissions (ProjectGuard, règles R1-R21) → gros chantier.
- 📄 **Perspective du mémoire (non implémenté).**

---

## 10. Édition de documents dans l'app (« documents vivants »)
Aujourd'hui : la GED **stocke** des fichiers (upload/download/versions).
- **Niveau 1 — éditeur riche en ligne** : type « page/document » éditable (TipTap / Quill / ProseMirror),
  contenu **stocké côté serveur** (dans la GED) + **versionné**. Verrou ou « dernier qui enregistre gagne ». *(Faisable, moyen.)*
- **Niveau 2 — collaboratif temps réel** (type Google Docs) : **CRDT (Yjs) + WebSocket** (infra STOMP déjà là),
  curseurs partagés, présence dans le doc. *(Gros chantier.)*
- 📄 **Perspective du mémoire (non implémenté).**

---

## 11. Calendrier & vues multiples des tâches
Deux niveaux distincts :
- **Vue Calendrier interne** ⭐ *(faible effort, gros effet, données déjà là)* : grille mois/semaine affichant les
  tâches sur leur `dueDate`/`startDate` + les réunions. Composant frontend (ex. FullCalendar), **aucun backend**.
  S'inscrit dans les **vues multiples** (Liste / Kanban / Timeline-Gantt / **Charge** / Calendrier).
- **Synchronisation calendrier externe** : (a) **flux iCal `.ics`** par utilisateur (`GET /users/me/calendar.ics`,
  lecture seule, abonnement Google/Outlook) — *raisonnable* ; (b) **API Google Calendar / Microsoft Graph**
  (OAuth, bidirectionnel) — *gros chantier, dépendances externes*.
- 📄 Non présent dans le mémoire → **à ajouter après la soutenance** (excellent candidat « premier ajout »).

**Filtrage par période sur le tableau de bord** : sélecteur `from`/`to` (semaine / mois / trimestre / personnalisé).
Nécessite que `GET /workspaces/{id}/dashboard` accepte un intervalle et **recalcule** les agrégats (KPI, charge,
alertes) côté serveur + un sélecteur côté frontend. *(Modif d'une fonctionnalité existante → post-soutenance.)*

---

## 12. Résilience & cohérence dans l'architecture distribuée (événementiel)

Analyse de l'existant et perspectives — utile à défendre en soutenance (distingue *ce qui est couvert* de *ce qui ne l'est pas*).

### 12.1 Ce qui EST couvert aujourd'hui ✅
- **Chorégraphie événementielle** (pas d'orchestrateur/saga central). À la création d'un projet, `ProjectServiceImpl`
  publie `project.created` sur l'exchange topic `nexawork.events` (`durable=true`). GED (`ProjectCreatedConsumer` →
  dossier racine « Pièces jointes aux tâches ») et Messaging (canaux) **réagissent indépendamment**.
- **Service consommateur arrêté = incohérence seulement temporaire.** Chaque consumer a sa **file dédiée et durable**
  (`nexawork.ged.project-created`, etc. — cf. `scripts/init-rabbitmq.sh`). Les événements s'y accumulent et sont
  traités au redémarrage.
- **Idempotence réelle** (un rejeu ne duplique pas) : index unique partiel `uk_ged_root_folder_per_project`
  `(project_id, folder_type) WHERE parent_id IS NULL` + `existsBy…` défensif dans le consumer. Idem contraintes
  d'unicité côté messaging (`uk_channel_members_channel_user`, `uk_channel_reads_channel_user`, `uk_reaction_once`).
- **Argument fort vs synchrone** : avec un appel HTTP direct, un échec est **perdu** (aucune trace). Ici l'événement est
  **persisté** → même en échec il reste **identifiable et rejouable**. L'opposition n'est pas *cohérent vs incohérent*,
  c'est **rattrapable vs perdu**.

### 12.2 Ce qui N'EST PAS couvert (perspectives, peu coûteuses) ❌
- **Message en échec durable (poison message).** Aucun `ErrorHandler`/`RetryTemplate`/`RepublishMessageRecoverer` ni
  **dead-letter exchange** n'est configuré → défauts Spring AMQP : sur exception le message est **remis en file
  immédiatement** (boucle serrée). Manque : **DLQ + relance à backoff croissant** pour isoler le message fautif et le
  rejouer après correction.
- **Incohérence déjà installée.** Aucune **tâche de réconciliation périodique** (`@Scheduled`) ne vérifie que chaque
  projet possède bien son dossier racine et ses canaux. (Le seul `@Scheduled` existant, `CallSweeper` du meeting-service,
  ferme les appels fantômes — sans rapport.) Complément naturel du point précédent.

### 12.3 Autorisation ≠ propagation d'état (point d'architecture important) ⭐
Cas « un membre retiré d'un projet ne doit plus voir la GED du projet » :
- **État actuel** : le contrôle d'accès GED (`AccessEvaluator.hasAccess`, règle REF G) s'arrête à l'**organisation** —
  `OPEN` = visible par **tout membre du workspace**, `PRIVATE` = créateur seul, `SHARED` = grants explicites.
  **L'appartenance au *projet* n'est jamais vérifiée.** → un membre retiré d'un projet **voit encore** les fichiers OPEN
  de ce projet (il reste membre du workspace). Lacune de correction si l'exigence est « GED projet = membres du projet ».
- **Mauvaise approche** : répliquer les membres dans le GED via événements `member-added/removed`. Une **révocation**
  d'accès exige une cohérence **immédiate** ; si l'événement `member-removed` est perdu (cf. absence de DLQ) →
  **trou de sécurité** pendant la fenêtre d'incohérence.
- **Bonne pratique** : **l'autorisation s'évalue à la requête, contre la source de vérité** — au listing/lecture d'un
  élément rattaché à un projet, le GED vérifie l'appartenance du `caller` au projet (appel au Project service — le
  `RestClient` existe déjà, il ne sert aujourd'hui qu'aux pièces jointes de tâches ; ou via un claim de membership).
  → révocation **atomique et immédiate**, **aucun saga ni compensation**, l'incohérence devient **impossible**.
- **Principe à retenir** : les événements/sagas propagent des **faits métier** (cohérence à terme acceptable) ;
  les **décisions d'autorisation** se vérifient à chaud (cohérence immédiate). Ne pas mélanger les deux.
- 📄 **Perspective (non implémenté).** Changement de sécurité sur un chemin de lecture critique → à faire **hors période
  de soutenance**, avec tests.

---

## ⚠️ Note de cohérence mémoire (IMPORTANT)
Le mémoire présente **explicitement comme PERSPECTIVES (non implémentées)** : les **automatisations poussées** (§4),
les **rôles personnalisés** (§9) et l'**édition de documents** (§10). → **Ne PAS les implémenter avant la soutenance** :
la démo doit rester **cohérente** avec le document. Les **présenter** en section « Perspectives » (avec le design
ci-dessus) est un **atout** ; les montrer implémentés créerait une **incohérence** que le jury relèverait.

---

## Ordre de reprise suggéré (après soutenance)
1. Dépendances typées (§1.1) — branchées sur le workflow.
2. Modèles de méthodologie (§1.4) — peu de code, gros effet.
3. Validateurs + post-fonctions de transition (§3).
4. Automatisations Phase 1 (§4), puis moteur de règles + constructeur visuel (automatisations poussées).
5. Hub 360° de la tâche (§5) — la signature.
6. Sprints (§1.3), puis IA (§6).
7. Rôles personnalisés (§9) et édition de documents (§10) — gros chantiers, à planifier.
