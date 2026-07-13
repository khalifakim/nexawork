# NexaWork — Reprise : session de correction post-tests

> **Copie-colle ce fichier entier comme premier message à une nouvelle instance Claude Code.**
> Il est autosuffisant : l'instance se localise via les fichiers de suivi + l'état Docker, puis continue.
>
> **Dernière mise à jour : 2026-07-12** — intégration code-complète, session de test en cours.

---

## 🎯 Mission

Tu reprends le développement de **NexaWork** (plateforme collaborative de gestion de projets — sujet de
mémoire de master). **Réponds toujours en français.**

## 📖 PREMIÈRE ACTION OBLIGATOIRE — lis ces fichiers dans l'ordre

1. **`nexawork/notes/IMPLEMENTATION_STATUS.md`** — l'état d'avancement réel. Ton point d'entrée.
2. **`nexawork/notes/PLAN_TEST_FINAL.md`** — le plan de test + la checklist en cours d'exécution.
3. **`docs-config/memoire/conception/references/nexawork-reference-v5.md`** — référentiel fonctionnel
   V5.1, **source de vérité** de l'application.
4. Vérifie l'état réel : `git log --oneline -5` et `git status` (branche `backend/dev`).

---

## 📍 OÙ ON EN EST

**L'intégration frontend ↔ backend est CODE-COMPLÈTE : 14/14 phases** (I0→I10 + bloc Meetings I8/M4/M2/M3).
Tout est committé et poussé sur `origin/backend/dev` (HEAD = `8be8a4c`).

**Contexte du sprint qui vient de s'achever** : sur décision de l'utilisateur (machine 8 Go / 4 CPU), tout a
été développé **d'affilée sans jamais lancer la stack**. Seul `ng build` (dev+prod) validait le frontend à
chaque phase. Conséquence : **beaucoup de code n'a jamais été exécuté**.

**Backend développé (neuf) pendant ce sprint** :
- `comment_attachments` (migration **V3**) — pièces jointes de commentaire de tâche
- `ProjectRole` binaire `PROJECT_LEAD`/`PROJECT_MEMBER` (migration **V4**)
- `GET /users/me/tasks` + `MentionResponse` enrichi (I7)
- **Recherche fédérée** `GET /search?q=` dans 4 services (I9) — respecte **REF F** (canaux privés) et
  **REF G** (documents restreints)
- **Rapports PDF OpenPDF** (I10) — `/projects/{id}/report` et `/workspaces/{id}/report`
- **Chat de réunion persistant** `MeetingMessage` + endpoints (M2)
- **`lobby_bypass`** dans `JitsiTokenService` (M3)

---

## ✅ CE QUI EST DÉJÀ VALIDÉ (session de test en cours)

- Les **6 images Docker compilent** (2 erreurs d'import corrigées et committées).
- **Les 4 migrations Flyway passent** (`success = t`), dont **V3** (`comment_attachments`) et **V4**
  (`project_role` migré en `PROJECT_LEAD`/`PROJECT_MEMBER`). Table `meeting_messages` en place.
- **Tous les services tournent `healthy`** — l'app complète est démarrée.

---

## 🎯 TA MISSION : corriger les bugs révélés par les tests

L'utilisateur déroule maintenant la **checklist §2 de `PLAN_TEST_FINAL.md`** dans le navigateur
(http://localhost:4200, compte OWNER). Il va te signaler ce qui casse, **phase par phase**.

Pour chaque bug :
1. **Reproduis / localise** — lis le code concerné, ne devine pas.
2. **Corrige à la racine**, sans casser le reste.
3. **Vérifie** : `ng build` pour le frontend ; pour le backend, l'utilisateur relance
   `docker compose build <service>` puis `up -d --no-deps --force-recreate <service>`.
4. **Propose le commit** (l'utilisateur exécute Git lui-même).

**Zones les plus à risque** (jamais exercées à l'exécution) :
- **Temps réel STOMP** : canaux/conversations (I4), notifications + présence (I6).
- **GED** (I5) : résolution nom→UUID de l'arborescence, uploads MinIO, réconciliation des grants.
- **Recherche** (I9) et **PDF** (I10) : premier passage runtime.
- **Meetings** : l'IFrame JaaS exige une clé JaaS réelle configurée.

---

## 🖥️ ENVIRONNEMENT — particularités CRITIQUES

1. **Machine 4 CPU / 8 Go.** Les JVM Spring Boot saturent un cœur **au démarrage**. Ne JAMAIS démarrer
   plusieurs services d'un coup → ils ressortent tous `unhealthy` alors que **rien n'est cassé**.
   **Démarrer UN service à la fois**, en attendant `Started …Application` dans les logs avant le suivant.
2. **Shell = `cmd.exe`** → `findstr`, **PAS `grep`**. Le `docker-compose.yml` est dans **`memoire-master/nexawork/`**.
3. **Ne JAMAIS activer `SPRINGDOC_ENABLED`** (init 81 s → timeouts front, famine Hikari).
4. **Jamais `docker compose build --no-cache frontend`** (le proxy TLS ferait échouer `npm install`).
5. **Tester uniquement via http://localhost:4200** (les ports Java hôtes 8080/8081 sont gelés par Docker
   Desktop/WSL2 ; nginx du conteneur frontend proxifie `/nexawork-*` et `/ws/*` vers la gateway).
6. `api-gateway` a un `depends_on` sur tout → **toujours `--no-deps`**.
7. `config-server` brûle ~120 % de CPU en continu mais n'est lu qu'au démarrage → `docker compose stop
   config-server` une fois tout `healthy` (le **rallumer** avant tout `--force-recreate`).
8. **Édition de `.sh`** : Edit/Write réécrit en **CRLF** sur ce poste → casse les scripts en conteneur Linux.
   Repasser en LF (`sed -i 's/\r$//'`) après édition.

---

## 🔒 RÈGLES NON NÉGOCIABLES

1. **Git : ne commite JAMAIS toi-même.** Tu **proposes** les blocs de commit (Bloc A = `nexawork`,
   Bloc B = `docs-config`), l'utilisateur exécute. **Aucun trailer `Co-Authored-By`.**
2. **Ne PAS faire `git checkout main` depuis `backend/dev`** (les branches diffèrent de milliers de fichiers ;
   un verrou Windows a déjà corrompu un checkout en plein milieu).
3. **Ne change pas le design ni les workflows du frontend.** On corrige des bugs, on ne redessine pas.
4. **V5.1 est la source de vérité** : toute divergence constatée → corriger `nexawork-reference-v5.md`
   immédiatement.
5. **`IMPLEMENTATION_STATUS.md` à jour** à la fin de chaque correction significative.
6. **Aucune fonctionnalité simulée dans le livrable.** Ce qui est annoncé comme livré au mémoire doit
   fonctionner. *(M5/M6 sont explicitement des perspectives hors périmètre — ça ne viole pas la règle.)*
7. **Vérifie toujours dans le code avant d'affirmer** qu'une chose est implémentée (le référentiel a déjà
   sur-affirmé plusieurs fois).

---

## 🚦 DÉMARRAGE

1. Lis les fichiers de référence ci-dessus.
2. `git status` (doit être propre sur `backend/dev`) et `docker compose ps`.
3. **Attends que l'utilisateur te signale le premier bug**, puis corrige-le méthodiquement.

Si l'utilisateur voit des toasts « Le serveur ne répond pas » → vérifie d'abord que `SPRINGDOC_ENABLED`
n'a pas été activé, et que le service concerné est bien `healthy`.
