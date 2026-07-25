package com.nexawork.notification.repositories;

import com.nexawork.notification.entities.Notification;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.repositories.projections.WorkspaceUnreadCount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
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

    /** Même filtre que {@link #findVisible}, restreint à un ensemble de types. */
    @Query("""
            SELECT n FROM Notification n
            WHERE n.recipientUserId = :me AND n.isHidden = false
              AND (n.workspaceId = :ws OR n.workspaceId IS NULL)
              AND (:unreadOnly = false OR n.read = false)
              AND n.type IN :types
            ORDER BY n.createdAt DESC
            """)
    Page<Notification> findVisibleByTypes(@Param("me") UUID me, @Param("ws") UUID workspaceId,
                                          @Param("unreadOnly") boolean unreadOnly,
                                          @Param("types") List<NotificationType> types, Pageable pageable);

    @Query("""
            SELECT count(n) FROM Notification n
            WHERE n.recipientUserId = :me AND n.isHidden = false AND n.read = false
              AND (n.workspaceId = :ws OR n.workspaceId IS NULL)
            """)
    long countUnread(@Param("me") UUID me, @Param("ws") UUID workspaceId);

    /**
     * Non-lues regroupées par workspace (tous espaces confondus) pour un
     * utilisateur. Volontairement NON scopé au workspace actif : c'est ce qui
     * permet l'indicateur « des non-lus dans un autre espace ». Les notifications
     * sans workspace (historique pré-scope) sont exclues — elles n'appartiennent
     * à aucun espace précis.
     */
    @Query("""
            SELECT n.workspaceId AS workspaceId, count(n) AS unread FROM Notification n
            WHERE n.recipientUserId = :me AND n.isHidden = false AND n.read = false
              AND n.workspaceId IS NOT NULL
            GROUP BY n.workspaceId
            """)
    List<WorkspaceUnreadCount> countUnreadByWorkspace(@Param("me") UUID me);
}
