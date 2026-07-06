# NexaWork — Reprise du développement (prompt réutilisable)

> **Usage** : copie-colle ce fichier entier comme prompt à une nouvelle instance Claude Code pour
> qu'elle reprenne le travail là où il s'est arrêté, **sans perte de contexte**. Réutilisable à
> l'identique (aucun mot à changer) — l'instance se localise seule via les fichiers de suivi + `git`.
>
> **Conseil** : change d'instance de préférence entre deux phases (phase finie + commitée). Si tu
> switches au milieu, demande d'abord de mettre à jour `IMPLEMENTATION_STATUS.md` + commit.

---

## 🎯 Ta mission

Tu reprends le développement de **NexaWork**, plateforme de travail collaboratif (9 microservices
Spring Boot 3.5 / Java 21 + frontend Angular 20). Le **backend est 100 % livré** et le **frontend est
construit sur mocks**. La phase actuelle est l'**intégration Frontend ↔ Backend** : brancher tous les
workflows du frontend aux vrais services backend (swap mock → HTTP), phase par phase, selon le **plan
faisant autorité**. Tu ne devines pas où on en est : tu le **découvres** en lisant les fichiers ci-dessous.

## 📖 Première action OBLIGATOIRE — localise-toi, puis lis

Avant TOUTE action :

1. **Lis `nexawork/notes/IMPLEMENTATION_STATUS.md`** — le tableau de suivi : quelles phases sont ✅ /
   🚧 / ⏳ / ⛔. **C'est ton point d'entrée** (section 2 « Suivi INTÉGRATION »).
2. **Lis `docs-config/memoire/notes/PLAN_INTEGRATION_FRONTEND_BACKEND.md`** — le **plan faisant
   autorité** : phases I0-I9 + track Meetings M2-M6, règles de travail (§0), mapping par domaine (Annexe A).
3. **Vérifie l'état réel des dépôts** :
   - `git -C D:/memoire-master/nexawork branch --show-current` (doit être `backend/dev`)
   - `git -C D:/memoire-master/nexawork status` + `log --oneline -5`
   - `git -C D:/memoire-master/docs-config status` (branche `main`)
   - `docker compose ps` (services healthy ?)
4. **Déduis ton point de départ** : la première phase ⏳ non bloquée dans le suivi. Si `git status`
   montre du travail non commité → une phase est **en cours**, reprends-la (ne recommence pas de zéro).
   En cas de doute, **demande au user**.

Références de contexte :

5. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel
   V5.1, **source de vérité**. Parties clés : §4 (modèle), §5 (SQL), §6 (enums), §7 (RabbitMQ + WebSocket
   §7.5), §9.9 (JaaS), §13 (endpoints REST), §14 (guide phases).
6. **Frontend** : `nexawork/nexawork-frontend/src/app/` — `core/services/*.service.ts` (contrats
   abstraits + mocks), `core/services/data.providers.ts` (le point de bascule mock↔HTTP),
   `core/models/*.models.ts`, `core/interceptors/` (jwt, error), `environments/`.
7. **Backend** : `nexawork/nexawork-backend/nexawork-{service}/` — controllers (endpoints réels), DTO
   (`dtos/responses`), entités. `nexawork-commons` = `Response<T>`, sécurité, audit.

## 📦 Contexte projet

- **Repo code** : `D:\memoire-master\nexawork\` — branche **`backend/dev`**. Remote `github.com/khalifakim/nexawork.git`.
- **Repo docs** (séparé) : `D:\memoire-master\docs-config\` — V5.1 + plans. Branche `main`.
- **Frontend** : `nexawork/nexawork-frontend/` — Angular 20, `provideDataServices()` bascule mock/HTTP.
  Contrats via `abstract *Service` ; les composants n'importent que l'abstrait.
- **Backend** : 9 microservices + Gateway (8080). Routes sous context-path `/nexawork-{service}-api-v1/api/v1/...`.
  Enveloppe `Response<T>{status,payload,metadata,message}`. Identité par headers Gateway ou JWT (login → refresh(workspaceId) pour le token org-scopé).
- **Infra Docker** : `docker-compose.yml` racine. **`.env`** (gitignoré, lecture seule) : credentials + clés JaaS/VAPID/SMTP.

## 📋 Méthode pour CHAQUE phase d'intégration (I0-I9, M2-M6)

1. **Lecture** — la phase dans le plan (Annexe A pour le mapping du domaine) + le contrat abstrait
   frontend concerné + les endpoints/DTO backend correspondants.
2. **Proposition** — présente au user la **liste précise des fichiers à créer/modifier** (`*HttpService`,
   extensions de contrat abstrait, mapping, composants à recâbler, `data.providers`), une phrase par
   fichier. **Attends sa validation avant de coder.**
3. **Développement** — implémente le `*HttpService` (dé-wrap `Response`, URLs context-path, mapping
   DTO↔view-model), étends le contrat abstrait pour les écritures, recâble les composants d'écriture
   (remplace les mutations locales `@Output`/signals par les appels service), bascule le binding vers
   HTTP dans `provideDataServices()`. Ne change pas l'UX.
4. **Build & test live** — `docker compose` (services healthy) + appels réels bout en bout (voir
   « Validation live fiable » dans IMPLEMENTATION_STATUS.md). Vérifie le workflow frontend réel.
5. **Doc en continu** — toute divergence/évolution → **corrige V5.1 immédiatement**.
6. **Fin de phase** — mets à jour **`IMPLEMENTATION_STATUS.md`** (statut + livré + tests). Compte-rendu :
   fichiers, tests, écarts, **deux blocs Git** (Bloc A = `nexawork`, Bloc B = `docs-config` si V5.1/plan modifié).
7. **Feu vert** — n'enchaîne pas sur la phase suivante sans « OK » du user.

## 🔒 Contraintes NON NÉGOCIABLES

1. **Git : ne commite JAMAIS.** Le user gère tout Git (add/commit/push/merge). Tu LIS (`status/log/diff`).
   Fin de phase → tu proposes les blocs, il exécute. **Pas de trailer `Co-Authored-By`.**
2. **Le frontend est la référence comportementale** — on ne change pas les workflows/UX ; on ajoute
   HTTP + mapping et on étend les contrats de services.
3. **V5.1 reste aligné à 100 %** — corrige-le dès qu'une divergence apparaît.
4. **`IMPLEMENTATION_STATUS.md` à jour à la fin de chaque étape.**
5. **Ne rien inventer** — info manquante → V5.1 / plan ; si ambigu → demande au user.
6. **`.env`** lecture seule. **`nexawork-commons`** : technique réutilisable uniquement.
7. **Réponds en français.**

## ⚙️ Notes d'environnement

Voir la section « Notes d'environnement » de `IMPLEMENTATION_STATUS.md` (build Maven WINDOWS-ROOT + JDK 21,
CRLF sur `.sh`, validation via conteneur `curlimages/curl` sur le réseau `nexawork_default`, PostgreSQL
`postgres`/7 bases, Flyway reset, Testcontainers désactivés par défaut).

## 🚀 Démarrage

Applique la séquence de localisation, déduis la phase à traiter (première ⏳ non bloquée, ou reprise
d'une phase en cours), relis le plan + le mapping du domaine, puis **propose au user la liste des fichiers
avant de coder**. Ne code rien avant sa validation. Si Docker Desktop est éteint, demande à le relancer.
Le user est disponible pour valider chaque étape.
