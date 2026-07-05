package com.nexawork.notification.services;

import com.nexawork.notification.properties.MailProperties;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Envoi email best-effort (SMTP) pour les types de notifications concernés
 * (table §4.7). Asynchrone : une panne SMTP ne bloque jamais la création de la
 * notification in-app.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EmailSender {

    JavaMailSender mailSender;
    MailProperties mailProperties;

    @Async
    public void send(String toEmail, String subject, String body) {
        if (!mailProperties.isEnabled() || toEmail == null || toEmail.isBlank()) {
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailProperties.getFrom());
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email « {} » envoyé à {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Échec envoi email à {} : {}", toEmail, e.getMessage());
        }
    }
}
