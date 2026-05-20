#!/bin/bash
# NexaWork — Initialisation des buckets MinIO

set -e

MC_ALIAS="nexawork-minio"
MINIO_URL="http://localhost:9000"
ACCESS_KEY="nexawork_minio"
SECRET_KEY="nexawork_minio_secret"

echo "Attente de MinIO..."
until mc alias set ${MC_ALIAS} ${MINIO_URL} ${ACCESS_KEY} ${SECRET_KEY} > /dev/null 2>&1; do
  sleep 2
done
echo "MinIO disponible."

# Créer les buckets
mc mb --ignore-existing ${MC_ALIAS}/nexawork-projects
mc mb --ignore-existing ${MC_ALIAS}/nexawork-chat

# Politique d'accès privé (les fichiers ne sont accessibles que via l'API)
mc policy set private ${MC_ALIAS}/nexawork-projects
mc policy set private ${MC_ALIAS}/nexawork-chat

echo "Buckets MinIO créés : nexawork-projects, nexawork-chat"
