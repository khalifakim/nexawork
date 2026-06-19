package com.nexawork.notification.controllers;

import com.nexawork.notification.dtos.responses.NotificationResponse;
import com.nexawork.notification.security.SecurityUtils;
import com.nexawork.notification.services.NotificationService;
import com.nexawork.notification.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Notifications")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Mes notifications")
    @GetMapping
    public ResponseEntity<Response<List<NotificationResponse>>> getAll() {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.ok(Response.ok(
            notificationService.getNotifications(userId), "Notifications récupérées"));
    }

    @Operation(summary = "Nombre de non lues")
    @GetMapping("/unread-count")
    public ResponseEntity<Response<Map<String, Long>>> unreadCount() {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.ok(Response.ok(
            Map.of("count", notificationService.countUnread(userId)), "Compteur récupéré"));
    }

    @Operation(summary = "Marquer tout comme lu")
    @PatchMapping("/mark-all-read")
    public ResponseEntity<Response<Void>> markAllAsRead() {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Response.ok(null, "Notifications marquées comme lues"));
    }

    @Operation(summary = "Masquer une notification")
    @PatchMapping("/{notifId}/hide")
    public ResponseEntity<Response<Void>> hide(@PathVariable Long notifId) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        notificationService.hideNotification(notifId, userId);
        return ResponseEntity.ok(Response.ok(null, "Notification masquée"));
    }

    @Operation(summary = "Statut de présence")
    @GetMapping("/presence/{userId}")
    public ResponseEntity<Response<Map<String, Boolean>>> presence(@PathVariable Long userId) {
        return ResponseEntity.ok(Response.ok(
            Map.of("online", notificationService.isOnline(userId)), "Statut récupéré"));
    }
}
