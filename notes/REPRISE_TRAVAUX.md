# NexaWork — Reprise des travaux (à lire au démarrage d'une nouvelle session)

> **Contexte** : session très longue du 2026-07-24. Tout ce qui suit est **commité et poussé**
> sur `main` ET `backend/dev` (dernier commit **`8adadb7`**), local + distant, les deux branches alignées.
> Réponds en **français**. Machine 8 Go/4 cœurs → déployer service par service (`--no-deps`).

---

## ✅ Livré cette session (déployé + poussé)

1. **Vue Calendrier projet** — 3ᵉ mode d'affichage des tâches (à côté de Kanban/Gantt), onglet dans
   `projet-shell`. Grille mois/semaine/jour, **barres étalées** début→échéance empilées par pistes,
   **glisser-déposer** pour replanifier (durée conservée), **création depuis un jour** cliqué. Réutilise
   `KanbanStore` (zéro appel réseau en plus). Fichiers : `features/projets/calendrier/`.
   ⚠️ À l'oral : « 3ᵉ mode de visualisation des tâches », **jamais « agenda »** (perspective réunions du mémoire).

2. **Messagerie enrichie** (canaux + conversations, temps réel STOMP) :
   - **Modifier / supprimer** ses propres messages — fenêtre **15 min**, **même règle pour tous** (aucune
     exception admin). Boutons masqués passé 15 min (`canModify`).
   - **Suppression = trace conservée façon WhatsApp** (« … a supprimé ce message »). Backend : requêtes de
     listing ne filtrent plus `isDeleted` ; `toDto` **blanchit** le contenu d'un message supprimé.
   - **Répondre à un message** (citation) — cliquer la citation défile jusqu'à l'original.
   - **Réactions emoji** (barre rapide `👍❤️😂🎉✅👀`, toggle, temps réel).
   - Barre d'actions **flottante à côté du message** (droite = reçu, gauche = envoyé).
   - Backend : migrations **V5** (reply, colonne `reply_to_message_id`) + **V6** (table `message_reactions`).
     Endpoints `PATCH /messages/{id}` (édition), `POST /messages/{id}/reactions` (toggle).

3bis. **Option C — indicateur de non-lus des AUTRES espaces** (déployé, PAS encore commité) :
   - Backend notification : `GET /notifications/unread-by-workspace` (agrégat non scopé, aucun contenu exposé).
   - Frontend header (sélecteur d'espace) : **point discret** sur l'avatar de l'espace + point par ligne dans le
     menu « Autres espaces », polling 30 s. Isolation préservée (point seulement, jamais le contenu).

3ter. **Brique 4 — liens de partage externes GED** (déployé, PAS encore commité) :
   - Migration GED **V3** (`ged_shared_links` + colonnes `external_uploader_*` sur `ged_files`).
   - Backend : `GedFileClient` (relais octets vers File Service, **identité forgée** = créateur du lien, calqué sur
     le relais invité du Meeting), `SharedLinkService` (token opaque 32o, expiration **date OU nombre d'accès**,
     mot de passe **BCrypt**, révocation, garde-fous dépôt + **blocklist** exécutables). Contrôleurs authentifié
     (`/api/v1/ged/shares`) + **public** (`/api/v1/public/shares/**`).
   - Sécurité : `permitAll /api/v1/public/**` (GED) + `/nexawork-ged-api-v1/api/v1/public/**` (gateway
     `PublicPathMatcher`) + chemin ajouté au `jwt.interceptor` front (aucun Bearer sur le public). **Vérifié** :
     public → 404 (passe sans token), authentifié → 401.
   - Frontend : modal **« Générer un lien »** (mode lecture/dépôt, expiration date/N accès, mot de passe,
     révocation, copie, liste des liens existants) dans le menu GED ; **page publique `/s/:token`** (hors shell).
   - **Formats libres** (tout sauf exécutables), nom/email du déposant **optionnels** (anonymat possible).
   - **Aperçu enrichi** (`FilePreviewComponent` réutilisable) : **vidéo/audio**, image, PDF, **ZIP navigable**
     (liste + ouverture d'une entrée) — dans l'app ET sur la page publique. Modal d'aperçu **agrandi** (quasi
     plein écran) + nom du fichier remonté dans la barre du haut.

3. **Présence fiabilisée** (notification-service) — corrige la présence **asymétrique** :
   - Cause : le heartbeat de présence est un `setInterval` **ralenti par le navigateur en arrière-plan** →
     la clé Redis (TTL 30 s) expirait → l'utilisateur tombait hors ligne ; et l'ancien heartbeat ne
     **recréait pas** une clé expirée (juste `expire`, no-op).
   - Correctif : **`ensureOnline`** au heartbeat (recrée la clé si absente + diffuse) + **TTL 30 s → 90 s**.
   - Vérifié : les deux présences coexistent maintenant dans Redis (avant, une seule à la fois).

---

## 🔜 RESTE À FAIRE (dans l'ordre)

### A. Option C — indicateur de notifications des AUTRES workspaces ✅ FAIT (voir §3bis, à commiter)
**Constat vérifié** : les notifications sont **scopées au workspace actif**
(`NotificationRepository.findVisible` filtre `workspaceId = :ws`). Donc sur W1 on ne voit pas les notifs de W2.
**Décision retenue (hybride, façon Slack)** : garder la **liste** scopée, mais ajouter un **indicateur discret**
(point/badge) sur le **sélecteur de workspace** signalant qu'il y a des non-lus dans un AUTRE workspace —
**sans** révéler leur contenu (isolation préservée, pas de contradiction mémoire).
**À faire** :
- Backend : `NotificationRepository` → `SELECT n.workspaceId, COUNT(n) … WHERE recipient=:me AND read=false
  AND workspaceId IS NOT NULL GROUP BY n.workspaceId` ; endpoint `GET /notifications/unread-by-workspace`.
- Frontend : sélecteur de workspace = **`layouts/app-shell/sidebar-2/sidebar-2.component.ts`** (ou header) ;
  y afficher un point sur les workspaces (≠ actif) ayant des non-lus.

### B. Brique 4 — lien de partage externe GED ✅ FAIT (voir §3ter, à commiter)
**Décisions de conception validées avec l'utilisateur** :
- Lien **accessible sans compte** (sinon ce n'est pas « externe ») ; sécurité = **token opaque + expiration +
  mot de passe optionnel + portée limitée à l'élément**.
- **Modes** : lecture seule **ET** boîte de dépôt (upload par un externe, avec garde-fous).
- **Expiration** : par **date**, OU par **nombre d'accès/clics** (dont usage unique), OU **aucune** (permanent) — au choix.
- **Mot de passe** optionnel (page « entrez le mot de passe »). **Révocation** à tout moment.
- Upload externe : demander **nom/email** (identité invité légère) + **taille max** + **types autorisés** (liste
  blanche, bloquer `.exe/.bat/.js`) + **dossier de dépôt isolé** (l'externe ne voit pas le reste).
- Limite d'upload actuelle (à connaître) : **25 Mo/fichier** (Spring `max-file-size` du file-service ; nginx 100 Mo).

**Plan technique** :
- **Backend GED** (`nexawork-ged-service`, prochaine migration **V3**) : table `shared_link`
  (`token`, cible fichier/dossier, mode READ/DROP, `expires_at` nullable, `max_access` nullable, `access_count`,
  `password_hash` nullable, `created_by`, `revoked`). Endpoints **authentifiés** (créer / lister mes liens /
  révoquer) + endpoints **publics** (`/public/shares/{token}` consulter+valider, `…/download`, `…/upload`).
- **Sécurité (point sensible)** : ajouter `/public/**` au `permitAll` de `SecurityConfiguration` du GED (il a déjà
  une liste d'endpoints publics + un `GatewayIdentityFilter`) ; **ET modifier la gateway** pour laisser passer
  `/public/**` **sans exiger de token**. C'est LA partie à faire avec soin.
- **Frontend** : bouton « Générer un lien » dans le menu GED (fichier/dossier) + modal (mode, expiration, mot de
  passe, révocation, copie) ; **page publique** `/s/:token` hors app authentifiée (affichage + téléchargement +
  dépôt + saisie mot de passe).

### C. Aperçu de documents Office (Word) — post-brique 4, optionnel
> Note : l'aperçu **PDF / image / vidéo / audio / ZIP navigable** est désormais livré (`FilePreviewComponent`,
> §3ter). Il reste **uniquement le rendu Office** (docx/xlsx) à ajouter dans ce même composant via
> `docx-preview`/`mammoth.js` — les branches `@case` sont déjà prêtes à accueillir un cas `office`.
Objectif = **prévisualiser** (pas éditer — l'édition contredirait le mémoire, la prévisualisation est
**revendiquée** dans le mémoire donc conforme). **Solution retenue** : `docx-preview` ou `mammoth.js` **côté
navigateur** dans la visionneuse `shared/overlays/apercu-document` (déjà là pour PDF/images).
**⛔ Écarter `ngx-doc-viewer`** : il envoie les fichiers à Google/Microsoft (fichiers privés non accessibles +
fuite = contredit l'isolation stricte du mémoire).

---

## ⚠️ Rappels environnement (déjà payés)
- Après redéploiement frontend → **`Ctrl+Shift+R`** (chunks renommés). Pas besoin si seul un service backend change.
- `docker compose build` peut échouer **en silence** (proxy TLS) → vérifier le jar (`unzip -p /app/app.jar … | grep`).
- Scripts `.sh` : Edit/Write les repasse en CRLF → `sed -i 's/\r$//'` (aucun script `.sh` touché récemment).
- Maven : `JAVA_HOME="/c/Program Files/Java/jdk-21" mvn -o -q -pl nexawork-<svc> -am compile`.
- `api-gateway` a `depends_on` sur tout → **`--no-deps`** pour recréer un service.
- Migrations Flyway : ne jamais modifier une migration appliquée ; vérifier que le n° de version est libre.
- Git : commits **sans** `Co-Authored-By`, **messages sans accents** (convention du repo). Pousser sur
  **`main` ET `backend/dev`** (fast-forward), local + distant.
- Présence : se teste avec **deux comptes différents** sur deux navigateurs.
