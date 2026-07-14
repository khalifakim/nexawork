package com.nexawork.notification.repositories;

import com.nexawork.notification.entities.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Notifications visibles d'un utilisateur DANS un workspace, paginées.
     *
     * <p>Le repli {@code workspaceId IS NULL} garde visibles les notifications
     * antérieures à la scope-par-workspace (elles n'en portaient pas) : sans lui,
     * un historique existant disparaîtrait d'un coup. Toute notification nouvelle
     * porte désormais son workspace.</p>
     */
    @Query("""
            SELECT n FROM Notification n
            WHERE n.recipientUserId = :me AND n.isHidden = false
              AND (n.workspaceId = :ws OR n.workspaceId IS NULL)
              AND (:unreadOnly = false OR n.read = false)
            ORDER BY n.createdAt DESC
            """)
    Page<Notification> findVisible(@Param("me") UUID me, @Param("ws") UUID workspaceId,
                                   @Param("unreadOnly") boolean unreadOnly, Pageable pageable);

    @Query("""
            SELECT count(n) FROM Notification n
            WHERE n.recipientUserId = :me AND n.isHidden = false AND n.read = false
              AND (n.workspaceId = :ws OR n.workspaceId IS NULL)
            """)
    long countUnread(@Param("me") UUID me, @Param("ws") UUID workspaceId);
}
