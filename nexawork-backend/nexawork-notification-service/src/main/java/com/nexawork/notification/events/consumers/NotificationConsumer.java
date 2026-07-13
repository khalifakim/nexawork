package com.nexawork.notification.events.consumers;

import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.properties.MailProperties;
import com.nexawork.notification.services.NotificationCreator;
import com.nexawork.notification.services.NotificationCreator.Command;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Consomme les 5 événements RabbitMQ (§7.2, §7.4) et crée les notifications
 * correspondantes (in-app + WebSocket + email selon la politique §4.7).
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationConsumer {

    NotificationCreator creator;
    MailProperties mail;

    @RabbitListener(queues = "nexawork.notification.member-invited")
    public void onMemberInvited(Events.MemberInvited e) {
        String url = mail.getFrontendBaseUrl() + "/auth/invite?token=" + e.invitationToken();
        creator.create(Command.builder()
                .recipientUserId(null) // invité non encore membre : email seul
                .recipientEmail(e.inviteeEmail())
                .type(NotificationType.MEMBER_INVITED)
                .title("Invitation à rejoindre « " + e.organisationName() + " »")
                .body(e.inviterDisplayName() + " vous invite à rejoindre l'espace « " + e.organisationName() + " ».")
                .targetUrl(url)
                .workspaceId(e.organisationId())
                .build());
    }

    @RabbitListener(queues = "nexawork.notification.task-assigned")
    public void onTaskAssigned(Events.TaskAssigned e) {
        creator.create(Command.builder()
                .recipientUserId(e.assigneeUserId())
                .type(NotificationType.TASK_ASSIGNED)
                .title("Nouvelle tâche assignée")
                .body("Une tâche vous a été assignée : « " + e.taskTitle() + " » (" + e.projectName() + ").")
                // Ouvre le Kanban du projet avec la fiche de tâche dépliée (?task=<id>).
                .targetUrl("/app/projets/" + e.projectId() + "/kanban?task=" + e.taskId())
                .payload(Map.of("taskId", e.taskId().toString(), "projectId", e.projectId().toString()))
                .build());
    }

    /** Nouveau commentaire : tous les membres du projet (hors auteur) sont notifiés. */
    @RabbitListener(queues = "nexawork.notification.task-commented")
    public void onTaskCommented(Events.TaskCommented e) {
        if (e.recipientUserIds() == null) {
            return;
        }
        for (java.util.UUID recipient : e.recipientUserIds()) {
            creator.create(Command.builder()
                    .recipientUserId(recipient)
                    .type(NotificationType.MENTION)
                    .title("Nouveau commentaire")
                    .body("Commentaire sur « " + e.taskTitle() + " » (" + e.projectName() + ") : " + e.excerpt())
                    .targetUrl("/app/projets/" + e.projectId() + "/kanban?task=" + e.taskId())
                    .payload(Map.of("taskId", e.taskId().toString(), "projectId", e.projectId().toString()))
                    .build());
        }
    }

    @RabbitListener(queues = "nexawork.notification.livrable-validated")
    public void onLivrableValidated(Events.LivrableValidated e) {
        if (e.assigneeUserId() == null) {
            return;
        }
        creator.create(Command.builder()
                .recipientUserId(e.assigneeUserId())
                .type(NotificationType.LIVRABLE_VALIDATED)
                .title("Livrable validé")
                .body("Votre livrable « " + e.taskTitle() + " » a été validé (" + e.projectName() + ").")
                .targetUrl("/app/projets/" + e.projectId() + "/tasks/" + e.taskId())
                .payload(Map.of("taskId", e.taskId().toString(), "projectId", e.projectId().toString()))
                .build());
    }

    @RabbitListener(queues = "nexawork.notification.call-ended")
    public void onCallEnded(Events.CallEnded e) {
        long minutes = e.durationSeconds() != null ? Math.round(e.durationSeconds() / 60.0) : 0;
        creator.create(Command.builder()
                .recipientUserId(e.hostUserId())
                .type(NotificationType.CALL_ENDED)
                .title("Réunion terminée")
                .body("La réunion « " + (e.topic() != null ? e.topic() : "") + " » est terminée — Durée : " + minutes + " min.")
                .workspaceId(e.organisationId())
                .payload(Map.of("callId", e.callId().toString()))
                .build());
    }

    @RabbitListener(queues = "nexawork.notification.meeting-invite")
    public void onMeetingParticipantInvited(Events.MeetingParticipantInvited e) {
        creator.create(Command.builder()
                .recipientUserId(e.recipientUserId())
                .type(NotificationType.MEETING_INVITED)
                .title("Réunion en cours")
                .body(e.inviterDisplayName() + " vous invite à la réunion « " + e.topic() + " » — Rejoindre.")
                .targetUrl("/app/reunions/" + e.callId())
                .workspaceId(e.organisationId())
                .payload(Map.of("callId", e.callId().toString()))
                .build());
    }

    @RabbitListener(queues = "nexawork.notification.external-guest")
    public void onExternalGuestInvited(Events.ExternalGuestInvited e) {
        String url = mail.getFrontendBaseUrl() + "/guest/" + e.guestToken();
        creator.create(Command.builder()
                .recipientUserId(null) // externe : email seul
                .recipientEmail(e.guestEmail())
                .type(NotificationType.EXTERNAL_GUEST_INVITED)
                .title("Invitation à une réunion")
                .body("Vous êtes invité à la réunion « " + e.topic() + " ».")
                .targetUrl(url)
                .build());
    }
}
