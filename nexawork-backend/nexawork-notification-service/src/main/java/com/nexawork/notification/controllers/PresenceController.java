package com.nexawork.notification.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.notification.services.PresenceService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Présence en ligne (V5.1 §3.9, §7.5). Vue « En ligne » (liste des connectés) et
 * test individuel. La présence est alimentée par les sessions WebSocket (Redis).
 */
@RestController
@RequestMapping("/api/v1/presence")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PresenceController {

    PresenceService presenceService;

    /** Vue « En ligne » : ensemble des utilisateurs actuellement connectés. */
    @GetMapping("/online")
    public Response<Set<UUID>> online() {
        return Response.<Set<UUID>>ok().setPayload(presenceService.onlineUsers());
    }

    @GetMapping("/{userId}")
    public Response<Map<String, Object>> isOnline(@PathVariable UUID userId) {
        return Response.<Map<String, Object>>ok()
                .setPayload(Map.of("userId", userId, "online", presenceService.isOnline(userId)));
    }
}
