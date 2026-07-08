# NexaWork — Reprise du travail (prompt pour une nouvelle instance Claude Code)

> Copie-colle ce fichier entier comme premier message à une nouvelle instance. Il est autosuffisant :
> l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.

---

## 🎯 Mission

Tu reprends le développement de **NexaWork** (plateforme collaborative). **Contexte** :
- **Backend** : 9 microservices Spring Boot 3.5 / Java 21 — **100 % développés** (branche `backend/dev`).
- **Frontend** : Angular 20 — **entièrement construit**, initialement sur données **mockées**.
- **Phase actuelle** : **intégration Frontend ↔ Backend** (remplacer les mocks par les vrais appels HTTP),
  **phase par phase**, selon un plan qui fait autorité. On NE change PAS le design ni les workflows du
  frontend — on branche simplement les vrais services backend.

**Réponds toujours en français.**

## 📖 Première action OBLIGATOIRE — lis ces fichiers dans l'ordre

1. **`nexawork/notes/IMPLEMENTATION_STATUS.md`** — le suivi d'avancement (quelles phases ✅/🚧/⏳). **Ton point d'entrée.**
2. **`docs-config/memoire/notes/PLAN_INTEGRATION_FRONTEND_BACKEND.md`** — le **plan faisant autorité** :
   phases I0→I10 + bloc final Meetings (M2-M6), avec pour chaque phase les endpoints exacts, DTO, signatures,
   mapping champ par champ, composants à recâbler, tests. **C'est ta feuille de route.**
3. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel V5.1
   (**source de vérité** de l'app). À maintenir aligné à 100 % avec le réel.
4. Vérifie l'état réel : `git -C D:/memoire-master/nexawork status` + `log --oneline -5` ;
   `docker compose ps`.

## 📍 Où on en est précisément (2026-07-08)

- **I0 · Socle transverse** : ✅ (enveloppe `Response<T>`/`unwrap`, context-paths `core/http/api.config.ts`,
  UUID, intercepteurs jwt/error + timeout, `environment.mock` par domaine).
- **I1 · Auth & Workspace** : ✅ quasi complet, **en cours de validation finale** :
  - I1a login/register/redirection · I1b workspaces & session (token org-scopé via `refresh(workspaceId)`) ·
    I1c reset MDP / invitations / membres · **I1d emails réels + vérification + profil + sécurité**.
  - `environment.mock.auth = false` → **auth branché sur le vrai backend**. Le reste des domaines reste en mock.

### ⚠️ TÂCHE IMMÉDIATE — finaliser le test auth (I1)
Des changements auth viennent d'être faits mais **les images Docker étaient périmées** (le cache BuildKit a
sauté la recompilation → le conteneur tournait du vieux code : 2 emails au lieu d'1, `verify-email` sans session).
Il faut :
1. **Reconstruire** : `docker compose build auth-service frontend` puis **vérifier la date des images**
   (`docker images nexawork-auth-service nexawork-frontend --format "{{.CreatedAt}}"`). Si une date est vieille
   → `docker compose build --no-cache auth-service frontend`.
2. **Redéployer** : `docker compose up -d --no-deps --force-recreate auth-service frontend`, attendre `healthy`.
3. **Tester dans le navigateur** (http://localhost:4200) le parcours **fondateur** :
   créer compte → 1 seul email « Vérifiez votre adresse » (plus de « Bienvenue ! ») → cliquer le lien →
   confirmation automatique → redirection vers **création du 1ᵉʳ workspace** → entrée dans l'app.
   Puis : login bloqué si non vérifié (403) ; Paramètres ▸ Profil (prénom/nom/fonction réels) ;
   Sécurité (changer email/mot de passe) ; Mot de passe oublié (vrai email) ; Invitation (vrai email + relance) ;
   parcours **invité** (`/auth/invite?token=` → rejoint le workspace, auto-vérifié).
4. **Détail non fini** : persistance de la **photo de profil** → nécessite le File Service (avatar/MinIO),
   reportée à la phase I5. Prénom/nom/fonction sont déjà sauvegardés.

Après validation → mettre à jour `IMPLEMENTATION_STATUS.md` et proposer les blocs de commit.

## 🖥️ SETUP D'EXÉCUTION (particularités CRITIQUES de cette machine — 8 Go RAM)

1. **Ne PAS tout lancer.** On démarre **uniquement les services de la phase en cours**. Pour l'auth :
   `config-server`, `postgres`, `rabbitmq`, `auth-service`, `api-gateway`, `frontend` (**6 conteneurs**).
   ⚠️ `api-gateway` a un `depends_on` sur les 8 microservices → **toujours** la lancer avec `--no-deps` :
   `docker compose up -d --no-deps api-gateway` (elle route vers auth sans que les autres tournent).
2. **Ports Java hôtes gelés** : Docker Desktop (Windows/WSL2) **fige le port-forwarding** des services Java
   (`:8080`, `:8081`) — timeout depuis l'hôte, alors qu'ils répondent en interne (prouvé : `curl` interne = 200).
   → **On teste via http://localhost:4200** : le conteneur **frontend (nginx)** sert l'app ET **proxifie**
   `/nexawork-*` et `/ws/*` vers `api-gateway:8080` **en interne** (voir `nexawork-frontend/nginx.conf`).
   Ça **contourne** le gel. `ng serve` local NE marche PAS (il aurait besoin de `:8080` hôte).
3. **Tester en ligne de commande** = via un conteneur curl sur le réseau interne, jamais `localhost:8080` :
   `docker run --rm --network nexawork_default curlimages/curl:latest -s http://api-gateway:8080/...`
   (ou via `http://localhost:4200/nexawork-...` qui passe par nginx).
4. **Workflow rebuild/redeploy** (l'utilisateur préfère lancer ces commandes lui-même) :
   `docker compose build <service>` → **vérifier la date de l'image** → `docker compose up -d --no-deps --force-recreate <service>`.
   **Toujours `--force-recreate`** après un build (sinon l'ancien conteneur reste). Si l'image ne se met pas à jour
   (date inchangée) → `--build --no-cache`.
5. **Réseau à proxy TLS intercepteur** (entreprise/école) : casse le TLS sortant (certificat auto-signé).
   - SMTP Gmail : réglé via `mail.smtp.ssl.trust: ${SMTP_SSL_TRUST:*}` dans `config-repo/nexawork-auth.yml`
     → **les emails partent réellement**. En prod sans proxy, retirer ce trust.
   - Maven sur l'hôte : `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` + `JAVA_HOME=C:\Program Files\Java\jdk-21`.
     Le build **Docker** n'est pas affecté (chemin canonique).
6. **springdoc désactivé** en dev (`config-repo/application.yml`, `SPRINGDOC_ENABLED:false`) — évitait une init
   de ~25 s au 1ᵉʳ appel de chaque service.
7. **config-server** sert les fichiers du config-repo **directement** → un changement dans `config-repo/*.yml`
   est pris en compte au **redémarrage du service concerné** (pas besoin de reconstruire config-server).
8. **PostgreSQL** : conteneur `nexawork-postgres`, user `postgres`, 7 bases `nexawork_*_db`.
   Vider une table : `docker exec nexawork-postgres psql -U postgres -d nexawork_auth_db -c "TRUNCATE ... CASCADE;"`.

## 🔒 Règles NON NÉGOCIABLES

1. **Git : ne commite JAMAIS.** L'utilisateur gère tout Git. Tu proposes les blocs (Bloc A = `nexawork`,
   Bloc B = `docs-config` si V5.1/plan/config modifiés). **Aucun trailer `Co-Authored-By`.**
2. **Ne change pas le design/les workflows du frontend** — tu remplaces les données mockées par les vrais
   appels HTTP, tu étends les contrats de services (`abstract *Service`) et recâbles les handlers. Rien de visuel.
3. **Bascule par domaine** : chaque phase livrée → passer son drapeau `environment.mock.X` à `false`
   (+ binding HTTP dans `core/services/data.providers.ts`) et **tester dans le navigateur**. Pas de flip global final.
4. **V5.1 reste la source de vérité** : toute divergence/évolution → corriger `nexawork-reference-v5.md` immédiatement.
5. **`IMPLEMENTATION_STATUS.md` à jour à la fin de chaque étape.**
6. **Proposer la liste des fichiers avant de coder**, attendre le feu vert de l'utilisateur.
7. **Aucune fonctionnalité simulée dans le livrable final** (décision actée) : recherche globale (I9),
   rapports PDF (I10) et Meetings M2-M6 sont **tous à implémenter réellement**.

## 🗺️ Ce qui reste (ordre du plan)

I1 (finaliser) → **I2 Projects + Tasks/Kanban** → I3 Members → I4 Channels + Conversations (+ STOMP) →
I5 GED (+ File Service, y compris la photo de profil) → I6 Notifications (+ Web Push) → I7 Accueil/Dashboard →
I9 Recherche globale (backend fédéré ILIKE) → I10 Rapports PDF (OpenPDF) →
**bloc final Meetings** : I8 (socle + M1 déjà livré) → M4 IFrame JaaS → M2 chat → M3 lobby → M5 fichiers → M6 enregistrement.

## 🚀 Démarrage

Lis les 4 fichiers ci-dessus, vérifie `docker compose ps`, **finalise le test auth** (tâche immédiate),
puis enchaîne sur **I2** en proposant d'abord la liste des fichiers. L'utilisateur valide chaque étape.
Si Docker Desktop est éteint ou un port `:8080` figé, demande-lui de relancer Docker Desktop.
