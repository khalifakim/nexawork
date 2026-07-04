package com.nexawork.auth.services.impl;

import com.nexawork.auth.properties.MailProperties;
import com.nexawork.auth.services.EmailSender;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Impl Spring Mail (Gmail SMTP, STARTTLS — bloc spring.mail du config-repo).
 * Envois asynchrones : un échec SMTP ne fait pas échouer la requête métier.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SmtpEmailSender implements EmailSender {

    JavaMailSender mailSender;
    MailProperties mailProperties;

    @Override
    @Async
    public void sendWelcomeEmail(String to, String firstName) {
        send(to, "[NexaWork] Bienvenue !",
                "Bonjour " + firstName + ",\n\n"
                        + "Votre compte NexaWork a bien été créé.\n"
                        + "Connectez-vous : " + mailProperties.getFrontendBaseUrl() + "/auth/login\n\n"
                        + "L'équipe NexaWork");
    }

    @Override
    @Async
    public void sendEmailVerification(String to, String firstName, String verificationToken) {
        String link = mailProperties.getFrontendBaseUrl() + "/auth/verify?token=" + verificationToken;
        send(to, "[NexaWork] Vérifiez votre adresse email",
                "Bonjour " + firstName + ",\n\n"
                        + "Confirmez votre adresse email en cliquant sur ce lien :\n"
                        + link + "\n\n"
                        + "L'équipe NexaWork");
    }

    @Override
    @Async
    public void sendPasswordReset(String to, String firstName, String resetToken) {
        String link = mailProperties.getFrontendBaseUrl() + "/auth/forgot/new?token=" + resetToken;
        send(to, "[NexaWork] Réinitialisation de votre mot de passe",
                "Bonjour " + firstName + ",\n\n"
                        + "Réinitialisez votre mot de passe en cliquant sur ce lien (valable 1 heure) :\n"
                        + link + "\n\n"
                        + "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n"
                        + "L'équipe NexaWork");
    }

    @Override
    @Async
    public void sendWorkspaceInvitation(String to, String inviterDisplayName, String workspaceName, String invitationToken) {
        String link = mailProperties.getFrontendBaseUrl() + "/auth/invite?token=" + invitationToken;
        send(to, "[NexaWork] " + inviterDisplayName + " vous invite à rejoindre « " + workspaceName + " »",
                "Bonjour,\n\n"
                        + inviterDisplayName + " vous invite à rejoindre l'espace de travail « " + workspaceName + " » sur NexaWork.\n"
                        + "Acceptez l'invitation en cliquant sur ce lien :\n"
                        + link + "\n\n"
                        + "L'équipe NexaWork");
    }

    private void send(String to, String subject, String body) {
        if (!mailProperties.isEnabled()) {
            log.info("Emailing désactivé — email '{}' vers {} non envoyé", subject, to);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailProperties.getFrom());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email '{}' envoyé à {}", subject, to);
        } catch (Exception e) {
            log.error("Échec d'envoi de l'email '{}' à {} : {}", subject, to, e.getMessage());
        }
    }
}
