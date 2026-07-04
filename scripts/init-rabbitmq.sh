#!/bin/bash
# NexaWork — Initialisation de l'exchange et des queues RabbitMQ.
#
# Ce script est exécuté par le sidecar `rabbitmq-init` (docker-compose.yml)
# une fois que le healthcheck du service `rabbitmq` est passé au vert.
#
# Les credentials sont lus depuis les variables d'environnement injectées par
# docker-compose depuis le fichier .env (source unique de vérité). Aucune
# valeur en dur — corrige l'incohérence historique
# `nexawork_pass` (underscore) vs `nexawork-passe` (tiret) documentée en
# `6-notes/PLAN_DEV_BACKEND.md` § B.1.

set -euo pipefail

RABBIT_USER="${RABBITMQ_USER:-nexawork}"
RABBIT_PASS="${RABBITMQ_PASS:?RABBITMQ_PASS est requis (voir .env)}"
RABBIT_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBIT_MGMT_PORT="${RABBITMQ_MGMT_PORT:-15672}"

# rabbitmqadmin communique via l'API HTTP Management (par défaut :15672)
RMQADMIN=(rabbitmqadmin --host="$RABBIT_HOST" --port="$RABBIT_MGMT_PORT" --username="$RABBIT_USER" --password="$RABBIT_PASS")

echo "Attente de RabbitMQ Management sur $RABBIT_HOST:$RABBIT_MGMT_PORT..."
until "${RMQADMIN[@]}" list vhosts >/dev/null 2>&1; do
  sleep 2
done
echo "RabbitMQ Management disponible."

# ── Exchange principal (topic) ─────────────────────────────────────────────────
"${RMQADMIN[@]}" declare exchange name=nexawork.events type=topic durable=true
echo "Exchange nexawork.events créé."

# ── Helper : déclare une queue + son binding sur nexawork.events ───────────────
declare_queue_binding() {
  local queue="$1"
  local routing_key="$2"
  "${RMQADMIN[@]}" declare queue name="$queue" durable=true
  "${RMQADMIN[@]}" declare binding source=nexawork.events \
    destination="$queue" routing_key="$routing_key"
  echo "  ✓ $queue ← $routing_key"
}

# ── Queues Notification Service ───────────────────────────────────────────────
echo "Notification queues :"
declare_queue_binding nexawork.notification.member-invited          member.invited
declare_queue_binding nexawork.notification.task-assigned           task.assigned
declare_queue_binding nexawork.notification.livrable-validated      livrable.validated
declare_queue_binding nexawork.notification.external-guest-invited  external.guest.invited

# ── Queues GED Service ────────────────────────────────────────────────────────
echo "GED queues :"
declare_queue_binding nexawork.ged.file-attached                    file.attached.to.task
declare_queue_binding nexawork.ged.project-created                  project.created

# ── Queue Messaging Service ───────────────────────────────────────────────────
echo "Messaging queues :"
declare_queue_binding nexawork.messaging.call-ended                 call.ended

echo "Toutes les queues et bindings RabbitMQ créés."
