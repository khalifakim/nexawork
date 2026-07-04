#!/bin/sh
# NexaWork — Initialisation des buckets MinIO.
#
# Exécuté par le sidecar `minio-init` (docker-compose.yml) une fois que le
# healthcheck du service `minio` est vert. Les credentials sont lus depuis les
# variables d'environnement injectées via .env — aucune valeur en dur.
#
# ── Modèle à 3 buckets par domaine fonctionnel ─────────────────────────────
# nexawork-documents  → patrimoine documentaire (GED, pièces jointes tâches,
#                       enregistrements réunion). Rétention indéfinie,
#                       backup quotidien, indexable full-text.
# nexawork-messaging  → flux de communication (fichiers canaux, conversations
#                       directes, partage réunion). Rétention configurable
#                       (30-365 j), purge auto via S3 Lifecycle, backup hebdo.
# nexawork-users      → identité (photos de profil, avatars). Rétention
#                       jusqu'à suppression du compte, CDN-friendly.
#
# Voir V5.1 §5.3 (StoredFile) et §12.1 (conteneurisation) pour justification.

set -eu

MC_ALIAS="local"
MINIO_URL="${MINIO_URL:-http://minio:9000}"
MINIO_USER="${MINIO_USER:?MINIO_USER est requis (voir .env)}"
MINIO_PASS="${MINIO_PASS:?MINIO_PASS est requis (voir .env)}"

echo "Attente de MinIO sur $MINIO_URL..."
until mc alias set "$MC_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS" >/dev/null 2>&1; do
  sleep 2
done
echo "MinIO disponible."

# Création des 3 buckets (idempotent — --ignore-existing ne fait rien si déjà là)
mc mb --ignore-existing "$MC_ALIAS/nexawork-documents"
mc mb --ignore-existing "$MC_ALIAS/nexawork-messaging"
mc mb --ignore-existing "$MC_ALIAS/nexawork-users"

# Politique d'accès privé — les fichiers ne sont accessibles que via l'API,
# jamais en URL publique directe. Les avatars (users) restent également
# privés en MinIO — le CDN de prod (si activé) les proxifiera avec une
# URL présignée courte.
mc anonymous set none "$MC_ALIAS/nexawork-documents" >/dev/null 2>&1 || true
mc anonymous set none "$MC_ALIAS/nexawork-messaging" >/dev/null 2>&1 || true
mc anonymous set none "$MC_ALIAS/nexawork-users"     >/dev/null 2>&1 || true

echo "Buckets MinIO créés : nexawork-documents, nexawork-messaging, nexawork-users"
