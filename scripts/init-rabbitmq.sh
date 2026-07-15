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

# ── Helper : supprime une queue obsolète si elle existe (idempotent) ───────────
delete_queue_if_exists() {
  local queue="$1"
  if "${RMQADMIN[@]}" delete queue name="$queue" >/dev/null 2>&1; then
    echo "  ✗ $queue supprimée (obsolète)"
  fi
}

# ── Nettoyage des queues obsolètes / renommées (réconciliation V5.1 §7.4) ──────
# - ged.file-attached : l'événement file.attached.to.task a été retiré (V5.1
#   §4.3/§7.2) — les pièces jointes de tâches sont tirées en HTTP synchrone.
# - notification.external-guest-invited : renommée en ...external-guest (§7.4).
# - messaging.call-ended : le message système « réunion terminée » dans le canal
#   du projet a été retiré (réunion rattachée au workspace, sans projet) — seule
#   Notification consomme désormais call.ended.
echo "Nettoyage queues obsolètes :"
delete_queue_if_exists nexawork.ged.file-attached
delete_queue_if_exists nexawork.notification.external-guest-invited
delete_queue_if_exists nexawork.messaging.call-ended

# ── Queues Notification Service (6) — V5.1 §7.4 + Lot M1 ──────────────────────
echo "Notification queues :"
declare_queue_binding nexawork.notification.member-invited      member.invited
declare_queue_binding nexawork.notification.task-assigned       task.assigned
declare_queue_binding nexawork.notification.task-commented     task.commented
declare_queue_binding nexawork.notification.livrable-validated  livrable.validated
declare_queue_binding nexawork.notification.call-ended          call.ended
declare_queue_binding nexawork.notification.external-guest      external.guest.invited
declare_queue_binding nexawork.notification.mention             message.mention
declare_queue_binding nexawork.notification.meeting-invite      meeting.participant.invited

# ── Queue GED Service (1) — V5.1 §7.4 ─────────────────────────────────────────
echo "GED queues :"
declare_queue_binding nexawork.ged.project-created              project.created

# ── Queues Messaging Service (2) — V5.1 §7.4 ──────────────────────────────────
echo "Messaging queues :"
declare_queue_binding nexawork.messaging.project-created        project.created
declare_queue_binding nexawork.messaging.project-deleted        project.deleted

echo "Toutes les queues et bindings RabbitMQ créés."
