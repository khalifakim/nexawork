-- NexaWork — Initialisation des bases de données PostgreSQL
-- Ce script est exécuté automatiquement au démarrage du conteneur postgres

CREATE DATABASE nexawork_auth_db;
CREATE DATABASE nexawork_project_db;
CREATE DATABASE nexawork_messaging_db;
CREATE DATABASE nexawork_meeting_db;
CREATE DATABASE nexawork_notification_db;
CREATE DATABASE nexawork_file_db;
CREATE DATABASE nexawork_ged_db;

GRANT ALL PRIVILEGES ON DATABASE nexawork_auth_db TO nexawork;
GRANT ALL PRIVILEGES ON DATABASE nexawork_project_db TO nexawork;
GRANT ALL PRIVILEGES ON DATABASE nexawork_messaging_db TO nexawork;
GRANT ALL PRIVILEGES ON DATABASE nexawork_meeting_db TO nexawork;
GRANT ALL PRIVILEGES ON DATABASE nexawork_notification_db TO nexawork;
GRANT ALL PRIVILEGES ON DATABASE nexawork_file_db TO nexawork;
GRANT ALL PRIVILEGES ON DATABASE nexawork_ged_db TO nexawork;
