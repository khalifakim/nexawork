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

## Ordre de reprise suggéré (après soutenance)
1. Dépendances typées (§1.1) — branchées sur le workflow.
2. Modèles de méthodologie (§1.4) — peu de code, gros effet.
3. Validateurs + post-fonctions de transition (§3).
4. Automatisations Phase 1 (§4).
5. Hub 360° de la tâche (§5) — la signature.
6. Sprints (§1.3), puis IA (§6).
