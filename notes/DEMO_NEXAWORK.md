# Jeu de données de démonstration — NexaWork

> Généré par `scripts/seed-demo/seed.mjs`. Pour régénérer : voir « Régénérer » en bas.
> **Application** : http://localhost:4200 · **Mot de passe de tous les comptes** : `motdepasse`

---

## 1. Comptes (15) — noms comoriens & sénégalais

| Email | Nom | Poste | Rôle (Nexa Studio) |
|---|---|---|---|
| akimkhalif7@gmail.com | Khalif Akim | Chef de projet | **Propriétaire** |
| fatoumata.ndiaye@nexa.io | Fatoumata Ndiaye | Product Designer | Admin |
| ibrahima.fall@nexa.io | Ibrahima Fall | Lead Developer | Admin |
| mariama.ba@nexa.io | Mariama Bâ | Développeuse Frontend | Membre |
| ousmane.sow@nexa.io | Ousmane Sow | Développeur Backend | Membre |
| coumba.sarr@nexa.io | Coumba Sarr | UX Designer | Membre |
| cheikh.gueye@nexa.io | Cheikh Gueye | Ingénieur DevOps | Membre |
| aissatou.diallo@nexa.io | Aïssatou Diallo | QA Engineer | Membre |
| moussa.faye@nexa.io | Moussa Faye | Développeur Mobile | Membre |
| nafissatou.mbaye@nexa.io | Nafissatou Mbaye | Business Analyst | Membre |
| nassuf.abdou@nexa.io | Nassuf Abdou | Développeur Fullstack | Membre |
| zalifa.mohamed@nexa.io | Zalifa Mohamed | Cheffe Produit | Admin |
| said.alimmadi@nexa.io | Saïd Ali Mmadi | Ingénieur Data | Membre |
| aicha.abderemane@nexa.io | Aïcha Abdérémane | Community Manager | Membre |
| youssouf.attoumani@nexa.io | Youssouf Attoumani | Support & Administration | Membre |

**Compte principal pour la démo : `akimkhalif7@gmail.com` / `motdepasse`** (propriétaire, voit tout).

---

## 2. Workspaces
- **Nexa Studio** — workspace principal (15 membres, tout le contenu).
- **Coopérative Dakar-Moroni** — workspace secondaire (5 membres : Khalif, Fatoumata, Ibrahima, Nassuf, Zalifa) pour **démontrer le changement de workspace** (menu en haut à gauche).

---

## 3. Projets (Nexa Studio)

| Projet | Préfixe | Chef de projet | Équipes | Tâches |
|---|---|---|---|---|
| App mobile NexaPay | `NPAY` | Ibrahima Fall | Design, Développement, Qualité | NPAY-1 … NPAY-12 |
| Refonte site vitrine | `WEB` | Fatoumata Ndiaye | Design, Contenu | WEB-1 … WEB-10 |
| Migration infra cloud | `INFRA` | Cheikh Gueye | Infrastructure, Data & QA | INFRA-1 … INFRA-10 |

Chaque projet contient des tâches avec statuts variés (À faire / En cours / Terminé), priorités, échéances (dont **en retard**), assignation à **une personne ou une équipe**, sous-tâches et commentaires. Le workspace secondaire contient le projet **Suivi coopératif** (`COOP`).

**Tâches utiles pour la démo :**
- `NPAY-2` Maquettes écran de paiement (En cours, assignée à l'**équipe Design**)
- `NPAY-3` API d'authentification (JWT) (En cours, **en retard**, Urgente)
- `NPAY-7` Corriger le crash au démarrage Android (En cours, **en retard**, Urgente)
- `INFRA-3` Provisionnement Kubernetes (assignée à l'**équipe Infrastructure**)

---

## 4. GED (documents)
Dossiers : **Ressources RH**, **Contrats & Légal** (privé), **Design & Maquettes**, **Livrables clients**, **Boîte de dépôt**.

Fichiers réels importés (versions, accès OPEN/PRIVÉ/PARTAGÉ). Liens de partage créés :
- **Lecture seule (READ)** : *Présentation NexaWork.pptx*, *Guide Spring Boot — CRUD.pdf*
- **Dépôt (DROP)** : dossier *Boîte de dépôt*
- **Lecture + dépôt (READ_WRITE)** : dossier *Livrables clients*

Fichiers avec version supplémentaire : *Maquette écran principal.png*. Fichiers partagés à des membres précis : *Autorisation de soutenance.pdf*, *Budget prévisionnel 2026.xlsx*.

---

## 5. Messagerie
Canaux : `#général`, `#annonces` (lecture seule), `#design` (projet Web), `#dev-nexapay` (projet NexaPay), `#infra-ops`, `#direction` (privé). Conversations privées pré-remplies : Khalif↔Ibrahima, Fatoumata↔Coumba, Cheikh↔Saïd.

### Syntaxe des mentions (autocomplétion à la saisie)
| Écrire | Effet |
|---|---|
| `@` puis un nom | mentionner une **personne** (la notifie) |
| `@@` puis une clé | référencer une **tâche** (ex. `@@NPAY-3`) |
| `@@@` puis un nom | référencer un **document** |
| `#` puis un nom | lien vers un **canal** |

> ⚠️ En **copier-coller**, le texte s'affiche mais pour qu'une mention pointe la bonne cible et notifie, il faut la **re-sélectionner dans la liste d'autocomplétion** qui apparaît quand tu tapes `@`, `@@`, `@@@` ou `#`.

---

## 6. Messages types à copier-coller (démo)

### Canal `#général`
```
Bonjour à toutes et à tous 👋 On lance officiellement le sprint aujourd'hui.
```
```
@Ibrahima peux-tu partager l'avancement sur @@NPAY-3 ? C'est notre priorité cette semaine.
```
```
Les dernières maquettes sont dans #design, n'hésitez pas à commenter 🎨
```

### Canal `#dev-nexapay`
```
@Ousmane l'API d'authentification @@NPAY-3 est-elle prête pour la recette ?
```
```
Correctif du crash Android @@NPAY-7 poussé en préprod, à tester 📱
```
```
La doc technique est à jour dans @@@Présentation NexaWork.pptx
```

### Canal `#design`
```
@Coumba j'adore la nouvelle version de l'écran de paiement, on valide ✅
```
```
Petit ajustement à prévoir sur les icônes, réf. @@@Diagramme cas d'usage.svg
```

### Conversation privée (ex. avec Ibrahima Fall)
```
Salut @Ibrahima, on se cale un point rapide sur @@NPAY-9 (revue de sécurité) ?
```
```
Parfait. Je regarde aussi le budget dans @@@Budget prévisionnel 2026.xlsx avant vendredi.
```

### Canal `#annonces` (en tant que Khalif — propriétaire)
```
📢 Réunion mensuelle vendredi 10h en visio. Ordre du jour à venir dans #général.
```

### Canal `#infra-ops`
```
@Said la migration @@INFRA-5 est planifiée mercredi, tiens-toi prêt 🚀
```

---

## 7. Scénario de démonstration suggéré
1. **Connexion** avec `akimkhalif7@gmail.com` / `motdepasse`.
2. **Projets** : ouvrir *App mobile NexaPay* → tableau Kanban, ouvrir `NPAY-2` (modifier, commentaires, mentions), Gantt (changer l'échelle Jour/Semaine/Mois), onglet **Équipes → Progression** (cliquer un compteur → détail des tâches).
3. **GED** : parcourir les dossiers, ouvrir un document, montrer les **versions** et les **liens de partage** (lecture / dépôt / les deux).
4. **Messagerie** : canal `#général`, envoyer un message avec `@`, `@@`, `#` ; ouvrir une conversation privée.
5. **Changement de workspace** : basculer sur *Coopérative Dakar-Moroni* pour montrer l'isolation multi-espace.
6. **Réunions** : à créer/tester manuellement (l'appel Jitsi ne s'automatise pas).

---

## 8. Régénérer les données
```bash
# 1. Réinitialiser (destructif) — au choix :
docker compose down -v && docker compose up -d          # reset total (long : recréation des volumes)
# … ou, plus rapide (stack déjà démarrée), vider les tables puis reseed.

# 2. Lancer le seeder
node scripts/seed-demo/seed.mjs
```
Le script est **résilient** (re-login automatique en cas d'expiration de jeton) et rejoue l'ensemble : comptes, workspaces, projets, tâches, GED, messagerie.
