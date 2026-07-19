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
                .workspaceId(e.organisationId())
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
                    .workspaceId(e.organisationId())
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
                .workspaceId(e.organisationId())
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
                // Sans targetUrl, le frontend retombait sur un routage par CATÉGORIE
                // d'icône (CALL_ENDED est classé « message ») et ouvrait… les
                // conversations. La réunion s'ouvre sur sa page d'historique.
                .targetUrl(meetingUrl(e.callId()))
                .workspaceId(e.organisationId())
                .payload(Map.of("callId", e.callId().toString()))
                .build());
    }

    /** Page de la réunion (fil de discussion) — seule route existante pour un appel. */
    private String meetingUrl(java.util.UUID callId) {
        return "/app/reunions/historique/" + callId;
    }

    @RabbitListener(queues = "nexawork.notification.meeting-invite")
    public void onMeetingParticipantInvited(Events.MeetingParticipantInvited e) {
        creator.create(Command.builder()
                .recipientUserId(e.recipientUserId())
                .type(NotificationType.MEETING_INVITED)
                .title("Réunion en cours")
                .body(e.inviterDisplayName() + " vous invite à la réunion « " + e.topic() + " » — Rejoindre.")
                // `/app/reunions/{id}` N'EXISTE PAS comme route (seul
                // `/app/reunions/historique/{id}` est déclaré) : le clic ne menait nulle part.
                .targetUrl(meetingUrl(e.callId()))
                .workspaceId(e.organisationId())
                // Le frontend ouvre un modal d'appel entrant (façon Teams) sur
                // réception : il lui faut le sujet et l'appelant SANS avoir à
                // analyser le corps du message, qui est du texte d'affichage.
                // `Map.of` refuse les valeurs nulles (NPE) — d'où les replis.
                .payload(Map.of(
                        "callId", e.callId().toString(),
                        "topic", e.topic() != null ? e.topic() : "Réunion",
                        "actorName", e.inviterDisplayName() != null ? e.inviterDisplayName() : "Un membre"))
                .build());
    }

    /**
     * Mention (§4.7) : la personne visée est notifiée, avec un lien direct vers le
     * canal ou la conversation d'origine.
     */
    @RabbitListener(queues = "nexawork.notification.mention")
    public void onMessageMentioned(Events.MessageMentioned e) {
        String where = e.channelName() != null ? "#" + e.channelName() : "une conversation";
        // Le lien porte le message : la vue l'ouvre, l'y fait défiler et l'encadre.
        // Une conversation directe n'a que deux participants : elle se route par le
        // slug de l'auteur, seul interlocuteur possible du destinataire.
        String url = e.channelName() != null
                ? "/app/canaux/" + slug(e.channelName()) + "?message=" + e.messageId()
                : "/app/conversations/" + slug(author(e.authorDisplayName())) + "?message=" + e.messageId();
        creator.create(Command.builder()
                .recipientUserId(e.recipientUserId())
                .type(NotificationType.MENTION)
                .title("Vous avez été mentionné")
                .body(author(e.authorDisplayName()) + " vous a mentionné dans " + where + " : « " + e.excerpt() + " »")
                .targetUrl(url)
                .workspaceId(e.organisationId())
                .build());
    }

    /**
     * Nouveau message (§4.7) : cloche pour chaque destinataire (DM = l'autre
     * participant ; canal privé = ses membres). Le lien ouvre le fil ; le
     * {@code payload} porte le fil pour que le frontend n'affiche pas la cloche
     * quand l'utilisateur est déjà dans ce fil et l'efface à l'ouverture (décision §4).
     */
    @RabbitListener(queues = "nexawork.notification.message-created")
    public void onMessageCreated(Events.MessageCreated e) {
        if (e.recipientUserIds() == null || e.recipientUserIds().isEmpty()) {
            return;
        }
        boolean isChannel = e.channelId() != null;
        String body = isChannel
                ? "Nouveau message dans #" + e.channelName() + " : « " + e.excerpt() + " »"
                : author(e.authorDisplayName()) + " vous a envoyé un nouveau message : « " + e.excerpt() + " »";
        String url = isChannel
                ? "/app/canaux/" + slug(e.channelName())
                : "/app/conversations/" + slug(author(e.authorDisplayName()));
        String threadId = (isChannel ? e.channelId() : e.conversationId()).toString();
        for (java.util.UUID recipient : e.recipientUserIds()) {
            if (recipient == null || recipient.equals(e.authorUserId())) {
                continue; // jamais se notifier soi-même
            }
            creator.create(Command.builder()
                    .recipientUserId(recipient)
                    .type(NotificationType.MESSAGE_RECEIVED)
                    .title(isChannel ? "Nouveau message dans #" + e.channelName() : "Nouveau message")
                    .body(body)
                    .targetUrl(url)
                    .workspaceId(e.organisationId())
                    .payload(Map.of(
                            "threadKind", isChannel ? "channel" : "conversation",
                            "threadId", threadId))
                    .build());
        }
    }

    /**
     * Document partagé (§4.7) : le bénéficiaire est notifié. Le lien ouvre l'espace
     * « Partagé avec moi » du GED. Le nom du partageur n'est pas propagé au GED — on
     * ne l'invente pas (corps neutre), comme pour la mention.
     */
    @RabbitListener(queues = "nexawork.notification.document-shared")
    public void onDocumentShared(Events.DocumentShared e) {
        if (e.recipientUserId() == null) {
            return;
        }
        creator.create(Command.builder()
                .recipientUserId(e.recipientUserId())
                .type(NotificationType.DOCUMENT_SHARED)
                .title("Document partagé")
                .body("Un document « " + e.documentName() + " » a été partagé avec vous.")
                .targetUrl("/app/documents/partage")
                .workspaceId(e.organisationId())
                .build());
    }

    /** Ajout à un projet (§4.7) : le membre ajouté est notifié ; le lien ouvre le board. */
    @RabbitListener(queues = "nexawork.notification.member-added")
    public void onAddedToProject(Events.AddedToProject e) {
        if (e.recipientUserId() == null) {
            return;
        }
        creator.create(Command.builder()
                .recipientUserId(e.recipientUserId())
                .type(NotificationType.ADDED_TO_PROJECT)
                .title("Ajouté à un projet")
                .body("Vous avez été ajouté au projet « " + e.projectName() + " ».")
                .targetUrl("/app/projets/" + e.projectId() + "/kanban")
                .workspaceId(e.organisationId())
                .build());
    }

    /**
     * Mention dans un commentaire (§4.7, §5.3) : la personne visée est notifiée ; le
     * lien ouvre la fiche de tâche ancrée sur le commentaire ({@code ?task=…&comment=…}).
     */
    @RabbitListener(queues = "nexawork.notification.comment-mention")
    public void onCommentMention(Events.CommentMention e) {
        if (e.recipientUserId() == null) {
            return;
        }
        creator.create(Command.builder()
                .recipientUserId(e.recipientUserId())
                .type(NotificationType.MENTION)
                .title("Vous avez été mentionné")
                .body("Vous avez été mentionné dans un commentaire de « " + e.taskTitle() + " » : « " + e.excerpt() + " »")
                .targetUrl("/app/projets/" + e.projectId() + "/kanban?task=" + e.taskId() + "&comment=" + e.commentId())
                .workspaceId(e.organisationId())
                .payload(Map.of(
                        "taskId", e.taskId().toString(),
                        "projectId", e.projectId().toString(),
                        "commentId", e.commentId().toString()))
                .build());
    }

    /** Nom de l'auteur, ou un libellé neutre si la Gateway ne l'a pas propagé. */
    private String author(String displayName) {
        return displayName != null && !displayName.isBlank() ? displayName : "Quelqu'un";
    }

    /** Nom de canal → segment d'URL (le frontend route les canaux par slug). */
    private String slug(String name) {
        return java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
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
