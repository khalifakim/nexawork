#!/bin/bash
# NexaWork — Initialisation de l'exchange et des queues RabbitMQ
# Ce script est exécuté après le démarrage de RabbitMQ

set -e

echo "Attente de RabbitMQ..."
until rabbitmqctl status > /dev/null 2>&1; do
  sleep 2
done
echo "RabbitMQ disponible."

# Exchange principal de type topic
rabbitmqadmin \
  --username=nexawork \
  --password=nexawork_pass \
  declare exchange name=nexawork.events type=topic durable=true

echo "Exchange nexawork.events créé."

# ── Queues Notification ─────────────────────────────────────────────────────
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.notification.member-invited durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.notification.member-invited routing_key=member.invited

rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.notification.task-assigned durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.notification.task-assigned routing_key=task.assigned

rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.notification.livrable-validated durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.notification.livrable-validated routing_key=livrable.validated

rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.notification.external-guest-invited durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.notification.external-guest-invited routing_key=external.guest.invited

# ── Queues GED ──────────────────────────────────────────────────────────────
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.ged.file-attached durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.ged.file-attached routing_key=file.attached.to.task

rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.ged.project-created durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.ged.project-created routing_key=project.created

# ── Queue Messaging ─────────────────────────────────────────────────────────
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare queue name=nexawork.messaging.call-ended durable=true
rabbitmqadmin --username=nexawork --password=nexawork_pass \
  declare binding source=nexawork.events \
  destination=nexawork.messaging.call-ended routing_key=call.ended

echo "Toutes les queues et bindings RabbitMQ créés."
