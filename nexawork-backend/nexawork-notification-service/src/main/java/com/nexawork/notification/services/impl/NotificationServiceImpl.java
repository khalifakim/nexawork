package com.nexawork.notification.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.notification.dtos.responses.NotificationPageResponse;
import com.nexawork.notification.dtos.responses.NotificationResponse;
import com.nexawork.notification.entities.Notification;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.mappers.NotificationMapper;
import com.nexawork.notification.repositories.NotificationRepository;
import com.nexawork.notification.repositories.projections.WorkspaceUnreadCount;
import com.nexawork.notification.security.CallerContext;
import com.nexawork.notification.services.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Consultation des notifications (§13.7). Filtre {@code isHidden=false} par défaut ;
 * chaque utilisateur ne voit que ses propres notifications.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationServiceImpl implements NotificationService {

    NotificationRepository notificationRepository;
    NotificationMapper notificationMapper;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public NotificationPageResponse list(boolean unreadOnly, List<NotificationType> types, int page, int size) {
        UUID me = caller.userId();
        UUID ws = caller.organisationId();
        int pageSize = size <= 0 ? 20 : Math.min(size, 100);
        PageRequest pr = PageRequest.of(Math.max(page, 0), pageSize);

        // Scopé au workspace actif : une notification d'un autre espace n'a pas à
        // apparaître ici (le compteur de la cloche non plus). Filtre par type optionnel.
        Page<Notification> result = (types == null || types.isEmpty())
                ? notificationRepository.findVisible(me, ws, unreadOnly, pr)
                : notificationRepository.findVisibleByTypes(me, ws, unreadOnly, types, pr);

        List<NotificationResponse> items = result.getContent().stream().map(notificationMapper::asDto).toList();
        return NotificationPageResponse.builder()
                .notifications(items)
                .unreadCount(notificationRepository.countUnread(me, ws))
                .page(result.getNumber())
                .totalPages(result.getTotalPages())
                .totalElements(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Long> unreadCountByWorkspace() {
        return notificationRepository.countUnreadByWorkspace(caller.userId()).stream()
                .collect(Collectors.toMap(WorkspaceUnreadCount::getWorkspaceId, WorkspaceUnreadCount::getUnread));
    }

    @Override
    public void markRead(UUID id) {
        Notification n = requireMine(id);
        n.setRead(true);
        notificationRepository.save(n);
    }

    @Override
    public void hide(UUID id) {
        Notification n = requireMine(id);
        n.setIsHidden(true);
        notificationRepository.save(n);
    }

    @Override
    public void delete(UUID id) {
        // Suppression réelle : `requireMine` garantit qu'on ne supprime que la
        // sienne (404 si inconnue, 403 si celle d'un autre).
        notificationRepository.delete(requireMine(id));
    }

    private Notification requireMine(UUID id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification introuvable."));
        if (!n.getRecipientUserId().equals(caller.userId())) {
            throw new ForbiddenException("Cette notification ne vous appartient pas.");
        }
        return n;
    }
}
