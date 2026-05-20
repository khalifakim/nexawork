package com.nexawork.notification.events.consumers;

import com.nexawork.notification.configurations.RabbitMQConfig;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.Q_MEMBER_INVITED)
    public void onMemberInvited(Map<String, Object> event) {
        try {
            String email    = (String) event.get("inviteeEmail");
            String orgName  = (String) event.get("organisationName");
            String inviter  = (String) event.get("inviterDisplayName");
            String token    = (String) event.get("invitationToken");
            String url      = "/invitations/accept?token=" + token;

            log.info("Invitation membre [{}] vers {}", orgName, email);
            notificationService.createAndPush(0L, NotificationType.MEMBER_INVITED,
                "Invitation à rejoindre " + orgName,
                inviter + " vous invite à rejoindre l'organisation " + orgName, url);
        } catch (Exception e) {
            log.error("Erreur member.invited : {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.Q_TASK_ASSIGNED)
    public void onTaskAssigned(Map<String, Object> event) {
        try {
            Long assigneeId   = toLong(event.get("assigneeUserId"));
            String taskTitle  = (String) event.get("taskTitle");
            String projectName = (String) event.get("projectName");
            Long taskId       = toLong(event.get("taskId"));

            notificationService.createAndPush(assigneeId, NotificationType.TASK_ASSIGNED,
                "Nouvelle tâche assignée",
                "Tâche \"" + taskTitle + "\" dans le projet " + projectName,
                "/projects/" + event.get("projectId") + "/tasks/" + taskId);
        } catch (Exception e) {
            log.error("Erreur task.assigned : {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.Q_LIVRABLE_VALIDATED)
    public void onLivrableValidated(Map<String, Object> event) {
        try {
            Long assigneeId   = toLong(event.get("assigneeUserId"));
            String taskTitle  = (String) event.get("taskTitle");
            String projectName = (String) event.get("projectName");

            notificationService.createAndPush(assigneeId, NotificationType.LIVRABLE_VALIDATED,
                "Livrable validé",
                "Votre tâche \"" + taskTitle + "\" a été validée dans " + projectName,
                "/projects/" + event.get("projectId"));
        } catch (Exception e) {
            log.error("Erreur livrable.validated : {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.Q_CALL_ENDED)
    public void onCallEnded(Map<String, Object> event) {
        try {
            Long hostId   = toLong(event.get("hostUserId"));
            String topic  = (String) event.getOrDefault("topic", "Réunion");
            Integer dur   = event.get("durationSeconds") instanceof Number n ? n.intValue() : 0;

            notificationService.createAndPush(hostId, NotificationType.CALL_ENDED,
                "Appel terminé",
                "L'appel \"" + topic + "\" a duré " + dur / 60 + " min", "/meetings");
        } catch (Exception e) {
            log.error("Erreur call.ended : {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.Q_EXTERNAL_GUEST)
    public void onExternalGuestInvited(Map<String, Object> event) {
        try {
            String email      = (String) event.get("guestEmail");
            String guestName  = (String) event.get("guestDisplayName");
            String topic      = (String) event.getOrDefault("topic", "Réunion");
            String guestToken = (String) event.get("guestToken");
            log.info("Invitation externe {} ({}) pour appel {}", guestName, email, topic);
        } catch (Exception e) {
            log.error("Erreur external.guest.invited : {}", e.getMessage());
        }
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(value.toString());
    }
}
