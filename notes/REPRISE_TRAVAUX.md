# NexaWork — Reprise des travaux (à lire au démarrage d'une nouvelle session)

> **Contexte** : sessions des **2026-07-24** et **2026-07-25**. Tout ce qui suit est **commité et poussé**
> sur `main` ET `backend/dev` (dernier commit **`696055d`**), local + distant, les deux branches alignées.
> Réponds en **français**. Machine 8 Go/4 cœurs → déployer service par service (`--no-deps`).

---

## ⚠️ PIÈGE DE DÉPLOIEMENT FRONTEND (appris à la dure, 2026-07-25)

Le `docker compose build frontend` **se bloque** parfois **sans erreur** sur le `RUN npm install` **dans** le
conteneur (piège TLS/proxy réseau du build) : 0 sortie, aucune image produite, et à force **il sature le démon
Docker** (toutes les commandes deviennent lentes). Deux builds ont fini par aboutir mais après > 1 h chacun.

**Parade fiable (à privilégier) — déployer le frontend SANS `npm install` dans Docker :**
```bash
cd nexawork-frontend
npx --no-install ng build --configuration production        # build LOCAL (rapide, ~2 min, fiable)
docker cp dist/nexawork-frontend/browser/. nexawork-frontend:/usr/share/nginx/html/   # sert la nouvelle version
docker commit nexawork-frontend nexawork-frontend:latest     # PERSISTE dans l'image (survit au redémarrage)
```
Vérifier : `curl -s http://127.0.0.1:4200/index.html | md5sum` == `md5sum dist/.../browser/index.html`.
Si Docker reste lent → **redémarrer Docker Desktop** une fois (les conteneurs redémarrent ; le frontend est déjà
dans l'image, rien n'est perdu).

---

## ✅ Livré (déployé + poussé)

### Session 2026-07-24
- **Vue Calendrier projet** (3ᵉ mode d'affichage des tâches), **messagerie enrichie** (édition/suppression 15 min,
  réponses, réactions emoji, temps réel STOMP), **présence fiabilisée** (`ensureOnline`, TTL 90 s).
  ⚠️ À l'oral : « 3ᵉ mode de visualisation des tâches », **jamais « agenda »**.

### Session 2026-07-25
- **Option C — non-lus des AUTRES espaces** : `GET /notifications/unread-by-workspace` (agrégat, aucun contenu
  exposé) + point discret sur le sélecteur d'espace. Isolation préservée.
- **Brique 4 — liens de partage externes GED** : migration **V3** (`ged_shared_links` + colonnes
  `external_uploader_*`), token opaque, expiration date/N accès, mot de passe BCrypt, révocation, blocklist
  exécutables, `GedFileClient` (identité forgée = créateur du lien). Contrôleurs authentifié + **public**
  (`/api/v1/public/**` `permitAll` GED + gateway `PublicPathMatcher` + `jwt.interceptor`). Page publique `/s/:token`.
- **3 modes de lien** (dossier) : **READ** (lecture), **DROP** (dépôt aveugle, n'expose jamais l'existant),
  **READ_WRITE** (lecture + dépôt : voit l'existant ET dépose). `ShareMode` en texte → **aucune migration**.
- **Aperçu Office** dans la visionneuse (`FilePreviewComponent`, 100 % navigateur, aucun envoi externe) :
  - **Word `.docx`** → **docx-preview** (rendu fidèle façon pages Word ; a remplacé mammoth).
  - **Excel `.xlsx/.xls/.csv`** → SheetJS.
  - **PowerPoint `.pptx`** → **pptx-preview** (fidélité approximative).
  - `tsconfig` : `skipLibCheck` (les `.d.ts` de pptx-preview sont incomplets). `angular.json` :
    `allowedCommonJsDependencies` = jszip, @stomp/stompjs, lodash.
  - **Non couverts** : `.doc/.ppt` binaires anciens + ODF `.odt/.ods/.odp` (voir pistes futures).
- **Dépôt anonyme** affiché « **Anonyme** » (+ badge « externe »), plus jamais au nom du créateur du lien.
  ⚠️ Les dépôts anonymes faits AVANT le correctif gardent l'ancien nom (pas de marqueur en base).
- **Dates GED horodatées** (`formatDate` central) : < 24 h → « il y a 5 min / 3 h » ; ≥ 24 h → date + heure exacte.
- **Modal d'import GED épuré** : bouton simple → carte du fichier choisi → **aperçu avant validation** (sur le
  `File` local, avant upload).
- **Entrée = envoyer** (Maj+Entrée = retour à la ligne) dans `comment-composer` → canaux, conversations,
  commentaires de tâche. Neutralisé si un menu mentions/emoji est ouvert.
- **Messages « liste vide » adaptés** (mes documents / partagés avec moi) vs « aucun résultat de recherche ».
- **Loader de recherche globale** (la fédération interroge 4 services → plus de « Aucun résultat » trompeur).
- **Export Excel des tâches** (SheetJS, navigateur) — bouton **dans la toolbar Kanban** (avant « Ajouter une
  tâche »), icône tableur verte. Colonnes : clé, titre, statut, priorité, assigné, dates, estimation, commentaires.

---

## 🔜 PISTES FUTURES (à cadrer — candidates soutenance / AMELIORATIONS_FUTURES.md)

- **Rapport PDF projet** : **existe déjà** (backend Project Service §17.2, `GET /projects/{id}/report` ;
  `ReportsService.projectReport`, bouton « Générer un rapport » dans **vue-d-ensemble**). Amélioration = enrichir
  le **contenu du PDF côté backend** (burndown, retards détaillés, charge par membre, graphes).
- **Vue « Charge de travail »** (workload) : par membre, nb de tâches actives / en retard / à venir, à partir de
  `KanbanStore.allCards()`. Placement à décider (onglet Équipes du projet ?). 100 % frontend.
- **Tableau de bord d'accueil consolidé** : l'Accueil a **déjà** `mes-taches`, `mentions-recues`,
  `tableau-de-bord`. Améliorer/consolider plutôt que dupliquer (ajouter alertes/échéances).
- **Réunion → tâche** : transformer un point/décision d'une réunion en tâche du projet (lie deux modules).
- **Édition + co-édition temps réel Word/Excel** : **OnlyOffice Docs** ou **Collabora Online** = serveur de
  documents **auto-hébergé** (conteneur à part, ~2 Go RAM, iframe + callback). **Lourd/risqué** avant soutenance,
  et fait passer la GED de « prévisualisation » (revendiquée) à « édition » → à assumer. **Post-soutenance.**
- **Aperçu haute-fidélité pptx / `.doc`/`.ppt` / ODF** : conversion serveur **LibreOffice headless → PDF**
  (infra en plus) ou OnlyOffice.
- **Assistant IA** (résumé de canal, compte-rendu de réunion, description de tâche) via l'API Claude — fort effet
  jury mais coût/infra à cadrer.

---

## ⚠️ Rappels environnement (déjà payés)
- Après redéploiement frontend → **`Ctrl+Shift+R`** (chunks renommés). Pas besoin si seul un service backend change.
- **Frontend** : préférer la parade `ng build` local + `docker cp` + `docker commit` (voir en haut) plutôt que
  `docker compose build frontend` qui peut se bloquer sur `npm install`.
- `docker compose build` (backend) peut échouer **en silence** (proxy TLS) → vérifier le jar
  (`docker run --rm --entrypoint sh <img> -c "unzip -p /app/app.jar … | grep …"`).
- Scripts `.sh` : Edit/Write les repasse en CRLF → `sed -i 's/\r$//'`.
- Maven : `JAVA_HOME="/c/Program Files/Java/jdk-21" mvn -o -q -pl nexawork-<svc> -am compile`.
- `api-gateway` a `depends_on` sur tout → **`--no-deps`** pour recréer un service.
- Migrations Flyway : ne jamais modifier une migration appliquée ; vérifier que le n° de version est libre.
- Git : commits **sans** `Co-Authored-By`, **messages sans accents**. Pousser sur **`main` ET `backend/dev`**.
- ged-service démarre **lentement** (~6 min sur cette machine) : patienter le « Started GedServiceApplication ».
- Présence : se teste avec **deux comptes différents** sur deux navigateurs.
