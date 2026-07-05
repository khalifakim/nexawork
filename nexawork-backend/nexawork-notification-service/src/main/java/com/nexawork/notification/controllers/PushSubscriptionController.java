package com.nexawork.notification.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.notification.dtos.requests.RegisterPushRequest;
import com.nexawork.notification.dtos.requests.UnregisterPushRequest;
import com.nexawork.notification.services.PushSubscriptionService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Abonnements Web Push (§13.7) : enregistrement / désinscription depuis le
 * navigateur.
 */
@RestController
@RequestMapping("/api/v1/push/subscriptions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PushSubscriptionController {

    PushSubscriptionService pushSubscriptionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<Map<String, UUID>> register(@Valid @RequestBody RegisterPushRequest request) {
        UUID id = pushSubscriptionService.register(request);
        return Response.<Map<String, UUID>>created().setPayload(Map.of("id", id));
    }

    @DeleteMapping
    public Response<Void> unregister(@Valid @RequestBody UnregisterPushRequest request) {
        pushSubscriptionService.unregister(request.getEndpoint());
        return Response.deleted();
    }
}
