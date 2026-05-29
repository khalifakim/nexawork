# NexaWork

Plateforme collaborative unifiée — gestion de projets, messagerie, GED et visioconférence.
Mémoire Master 2 SID, UCAD Dakar.

**Stack :** Spring Boot 3.4.5 · Spring Cloud Gateway · Angular 20 · PostgreSQL 17 · RabbitMQ · Redis · MinIO · Jitsi Meet · Docker

---

## Prérequis

| Outil | Version |
|-------|---------|
| Docker Desktop | 4.x ou supérieur |

C'est le seul prérequis. Tout (Java, Node.js, Maven, Nginx) tourne dans les containers Docker.
La configuration de développement est identique à la configuration de production.

---

## Démarrage — tout lancer d'un coup

```powershell
cd "D:\Mémoire Master\nexawork"
docker compose up -d --build
```

Les containers démarrent dans le bon ordre automatiquement (healthchecks + depends_on).
Attendre ~3-5 minutes que tous les services Spring Boot soient `healthy`.

Vérifier l'état :
```powershell
docker compose ps
```

Tous les containers doivent afficher `healthy`.

---

## Démarrage progressif (recommandé pour vérifier chaque étape)

### Étape 1 — Infrastructure

```powershell
docker compose up -d postgres redis rabbitmq minio
```

Attendre que tous soient `healthy`, puis vérifier :

| Service | Vérification |
|---------|-------------|
| PostgreSQL | Connexion DBeaver : `localhost:5433` / user `postgres` / password `passe` |
| RabbitMQ | [http://localhost:15672](http://localhost:15672) — login `nexawork` / `nexawork-passe` |
| MinIO | [http://localhost:9001](http://localhost:9001) — login `nexawork` / `nexawork-passe` |
| Redis | `docker exec nexawork-redis redis-cli ping` → `PONG` |

---

### Étape 2 — Config Server

```powershell
docker compose up -d config-server
```

Vérification — doit retourner du JSON avec la config :

- [http://localhost:8888/actuator/health](http://localhost:8888/actuator/health) → `{"status":"UP"}`
- [http://localhost:8888/nexawork-auth/default](http://localhost:8888/nexawork-auth/default) → config du auth-service

---

### Étape 3 — Microservices

```powershell
docker compose up -d auth-service project-service messaging-service meeting-service notification-service file-service ged-service
```

Surveiller le démarrage (~2-3 min par service) :
```powershell
docker compose logs -f auth-service project-service
```

Vérification Swagger de chaque service :

| Service | Port | Swagger |
|---------|------|---------|
| Auth | 8081 | [http://localhost:8081/nexawork-auth-api-v1/swagger-ui/index.html](http://localhost:8081/nexawork-auth-api-v1/swagger-ui/index.html) |
| Project | 8082 | [http://localhost:8082/nexawork-project-api-v1/swagger-ui/index.html](http://localhost:8082/nexawork-project-api-v1/swagger-ui/index.html) |
| Messaging | 8083 | [http://localhost:8083/nexawork-messaging-api-v1/swagger-ui/index.html](http://localhost:8083/nexawork-messaging-api-v1/swagger-ui/index.html) |
| Meeting | 8084 | [http://localhost:8084/nexawork-meeting-api-v1/swagger-ui/index.html](http://localhost:8084/nexawork-meeting-api-v1/swagger-ui/index.html) |
| Notification | 8085 | [http://localhost:8085/nexawork-notification-api-v1/swagger-ui/index.html](http://localhost:8085/nexawork-notification-api-v1/swagger-ui/index.html) |
| File | 8086 | [http://localhost:8086/nexawork-file-api-v1/swagger-ui/index.html](http://localhost:8086/nexawork-file-api-v1/swagger-ui/index.html) |
| GED | 8087 | [http://localhost:8087/nexawork-ged-api-v1/swagger-ui/index.html](http://localhost:8087/nexawork-ged-api-v1/swagger-ui/index.html) |

---

### Étape 4 — API Gateway

```powershell
docker compose up -d api-gateway
```

Vérification :

- [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) → `{"status":"UP"}`

---

### Étape 5 — Frontend

```powershell
docker compose up -d frontend
```

Vérification :

- [http://localhost:4200](http://localhost:4200) → la page de connexion NexaWork doit s'afficher

---

### Étape 6 — Jitsi (visioconférence)

```powershell
docker compose up -d jitsi-prosody jitsi-web jitsi-jicofo jitsi-jvb
```

Vérification :

- [https://localhost:8443](https://localhost:8443) → accepter l'avertissement SSL (certificat auto-signé), la page Jitsi s'affiche

> Jitsi requiert un JWT généré par le meeting-service. Il n'est pas possible de rejoindre une réunion directement sans passer par NexaWork.

---

## Créer une réunion

Le flow complet passe par le gateway sur le port **8080**.

**1. Obtenir un token JWT** via Swagger auth-service :

→ [http://localhost:8081/nexawork-auth-api-v1/swagger-ui/index.html](http://localhost:8081/nexawork-auth-api-v1/swagger-ui/index.html)

→ `POST /api/v1/auth/login` → copier le `token` de la réponse.

**2. Créer la réunion** (Postman, curl, ou Swagger) :

```http
POST http://localhost:8080/nexawork-meeting-api-v1/api/v1/meetings
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Réunion de test",
  "projectId": null,
  "scheduledAt": null
}
```

**3. Utiliser la réponse** :

La réponse contient `jitsiToken` et `jitsiUrl`. Ouvrir `jitsiUrl` dans le browser → la réunion démarre directement.

---

## Tester les APIs (Swagger)

> Le Swagger de chaque service est accessible directement sur son port. Pour tester les endpoints protégés, il faut s'authentifier d'abord.

**Pour tester un endpoint protégé via Swagger :**

1. Ouvrir le Swagger du service souhaité
2. Aller sur `POST /api/v1/auth/login` dans le Swagger du [auth-service](http://localhost:8081/nexawork-auth-api-v1/swagger-ui/index.html) → obtenir le token
3. Cliquer **Authorize** (cadenas en haut à droite du Swagger)
4. Coller le token (sans le préfixe "Bearer ")
5. Tester les endpoints

> Les endpoints qui dépendent de `X-Organisation-Id` (meeting, file, ged...) doivent être appelés via le gateway ([http://localhost:8080](http://localhost:8080)) et non directement sur le port du service, car c'est le gateway qui injecte ces headers après validation du JWT.

---

## Modifier et rebuilder un service

Après modification du code d'un service :

```powershell
# Rebuilder et relancer un seul service
docker compose up -d --build auth-service

# Voir les logs en temps réel
docker compose logs -f auth-service
```

Les autres services continuent de tourner sans interruption.

---

## Bases de données (DBeaver / pgAdmin)

Connexion PostgreSQL :

| Paramètre | Valeur |
|-----------|--------|
| Host | `localhost` |
| Port | `5433` |
| Username | `postgres` |
| Password | `passe` |

> Dans DBeaver : clic droit sur la connexion → Edit Connection → onglet PostgreSQL → cocher **Show all databases**.

Bases disponibles :

| Base | Service |
|------|---------|
| `nexawork_auth_db` | Auth Service |
| `nexawork_project_db` | Project Service |
| `nexawork_messaging_db` | Messaging Service |
| `nexawork_meeting_db` | Meeting Service |
| `nexawork_notification_db` | Notification Service |
| `nexawork_file_db` | File Service |
| `nexawork_ged_db` | GED Service |

---

## Interfaces d'administration

| Interface | URL | Credentials |
|-----------|-----|-------------|
| RabbitMQ Management | [http://localhost:15672](http://localhost:15672) | `nexawork` / `nexawork-passe` |
| MinIO Console | [http://localhost:9001](http://localhost:9001) | `nexawork` / `nexawork-passe` |
| Config Server | [http://localhost:8888/actuator/health](http://localhost:8888/actuator/health) | — |
| API Gateway Health | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) | — |
| Jitsi Meet | [https://localhost:8443](https://localhost:8443) | JWT via meeting-service uniquement |

---

## Structure du projet

```
nexawork/
├── .env                              # Credentials (ne pas committer)
├── docker-compose.yml                # Orchestration complète
├── scripts/
│   └── init-databases.sql            # Création des 7 bases PostgreSQL
├── nexawork-config-repo/             # Configurations Spring Cloud Config
│   ├── application.yml               # Config commune à tous les services
│   ├── nexawork-auth.yml
│   ├── nexawork-project.yml
│   ├── nexawork-messaging.yml
│   ├── nexawork-meeting.yml
│   ├── nexawork-notification.yml
│   ├── nexawork-file.yml
│   ├── nexawork-ged.yml
│   └── nexawork-gateway.yml
├── nexawork-backend/
│   ├── nexawork-config-server/       # Config Server Spring Cloud (port 8888)
│   ├── nexawork-api-gateway/         # Gateway : routage + validation JWT (port 8080)
│   ├── nexawork-auth-service/        # Auth, users, organisations (port 8081)
│   ├── nexawork-project-service/     # Projets, tâches, sprints (port 8082)
│   ├── nexawork-messaging-service/   # Messagerie + WebSocket STOMP (port 8083)
│   ├── nexawork-meeting-service/     # Visioconférence Jitsi (port 8084)
│   ├── nexawork-notification-service/# Notifications temps réel (port 8085)
│   ├── nexawork-file-service/        # Upload fichiers via MinIO (port 8086)
│   └── nexawork-ged-service/         # Gestion électronique des documents (port 8087)
└── nexawork-frontend/                # Application Angular 20 (port 4200)
```

---

## Commandes Docker utiles

```powershell
# Lancer toute la stack (première fois ou après modification)
docker compose up -d --build

# Lancer sans rebuild (stack déjà buildée)
docker compose up -d

# État de tous les containers
docker compose ps

# Logs d'un service en temps réel
docker compose logs -f auth-service

# Arrêter tous les containers (données conservées)
docker compose down

# Reset complet — supprime tous les volumes et données
docker compose down -v

# Rebuilder un service sans cache (si build corrompu)
docker compose build --no-cache auth-service
```
