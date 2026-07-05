package com.nexawork.notification.repositories;

import com.nexawork.notification.entities.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** Notifications visibles (non masquées) d'un utilisateur, paginées. */
    Page<Notification> findByRecipientUserIdAndIsHiddenFalseOrderByCreatedAtDesc(UUID recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndIsHiddenFalseAndReadFalseOrderByCreatedAtDesc(
            UUID recipientUserId, Pageable pageable);

    long countByRecipientUserIdAndIsHiddenFalseAndReadFalse(UUID recipientUserId);
}
