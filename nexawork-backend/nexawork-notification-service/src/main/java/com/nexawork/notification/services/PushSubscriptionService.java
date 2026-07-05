package com.nexawork.notification.services;

import com.nexawork.notification.dtos.requests.RegisterPushRequest;

import java.util.UUID;

/**
 * Abonnements Web Push (§13.7) : enregistrement (upsert par endpoint) et
 * désinscription. Un utilisateur peut avoir plusieurs abonnements (multi-appareils).
 */
public interface PushSubscriptionService {

    UUID register(RegisterPushRequest request);

    void unregister(String endpoint);
}
