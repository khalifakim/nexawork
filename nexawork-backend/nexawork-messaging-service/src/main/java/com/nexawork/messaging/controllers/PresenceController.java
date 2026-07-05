package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Vue « En ligne » (§13.5, §3.9). La présence temps réel s'appuie sur Redis
 * (inscription à la connexion WebSocket, TTL + heartbeat) — livrée en Phase 8.
 * Ce endpoint retourne pour l'instant une liste vide (stub contractuel).
 */
@RestController
@RequestMapping("/api/v1/presence")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PresenceController {

    @GetMapping("/active")
    public Response<List<UUID>> active() {
        // Phase 8 : présence Redis (clé à TTL rafraîchie par heartbeat WebSocket).
        return Response.<List<UUID>>ok().setPayload(List.of());
    }
}
