package com.nexawork.auth.services;

/**
 * Contrat d'envoi d'emails transactionnels (§E.2 — SMTP réel dès Phase 2,
 * pas de mock : Gmail SMTP via Spring Mail).
 */
public interface EmailSender {

    void sendWelcomeEmail(String to, String firstName);

    void sendEmailVerification(String to, String firstName, String verificationToken);

    void sendPasswordReset(String to, String firstName, String resetToken);

    void sendWorkspaceInvitation(String to, String inviterDisplayName, String workspaceName, String invitationToken);
}
