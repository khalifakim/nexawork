package com.nexawork.notification.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.notification.dtos.responses.NotificationPageResponse;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.services.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Notifications de l'utilisateur courant (§13.7) : liste paginée (filtre tout /
 * non-lu), marquage lu, masquage.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {

    NotificationService notificationService;

    @GetMapping
    public Response<NotificationPageResponse> list(@RequestParam(defaultValue = "false") boolean unread,
                                                   @RequestParam(required = false) List<NotificationType> type,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return Response.<NotificationPageResponse>ok().setPayload(notificationService.list(unread, type, page, size));
    }

    /**
     * Non-lues par workspace (tous espaces de l'utilisateur). Alimente l'indicateur
     * discret du sélecteur d'espace : un point sur un espace ≠ actif ayant des non-lus,
     * sans jamais révéler le contenu (isolation par workspace préservée).
     */
    @GetMapping("/unread-by-workspace")
    public Response<Map<UUID, Long>> unreadByWorkspace() {
        return Response.<Map<UUID, Long>>ok().setPayload(notificationService.unreadCountByWorkspace());
    }

    @PatchMapping("/{id}/read")
    public Response<Void> markRead(@PathVariable UUID id) {
        notificationService.markRead(id);
        return Response.ok();
    }

    @PatchMapping("/{id}/hide")
    public Response<Void> hide(@PathVariable UUID id) {
        notificationService.hide(id);
        return Response.ok();
    }

    /** Suppression définitive depuis le menu de la cloche. */
    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        notificationService.delete(id);
        return Response.ok();
    }
}
