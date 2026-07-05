package com.nexawork.notification.services.impl;

import com.nexawork.notification.dtos.requests.RegisterPushRequest;
import com.nexawork.notification.entities.PushSubscription;
import com.nexawork.notification.repositories.PushSubscriptionRepository;
import com.nexawork.notification.security.CallerContext;
import com.nexawork.notification.services.PushSubscriptionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Abonnements Web Push (§13.7). Upsert par {@code endpoint} (UNIQUE) : ré-enregistrer
 * le même endpoint met à jour ses clés et son propriétaire.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PushSubscriptionServiceImpl implements PushSubscriptionService {

    PushSubscriptionRepository repository;
    CallerContext caller;

    @Override
    public UUID register(RegisterPushRequest request) {
        UUID me = caller.userId();
        Map<String, String> keys = Map.of(
                "p256dh", request.getKeys().getP256dh(),
                "auth", request.getKeys().getAuth());

        PushSubscription subscription = repository.findByEndpoint(request.getEndpoint())
                .orElseGet(() -> PushSubscription.builder().endpoint(request.getEndpoint()).build());
        subscription.setUserId(me);
        subscription.setKeys(keys);
        subscription = repository.save(subscription);
        log.info("Abonnement Web Push enregistré pour {} (…{})", me, tail(request.getEndpoint()));
        return subscription.getId();
    }

    @Override
    public void unregister(String endpoint) {
        repository.deleteByEndpoint(endpoint);
        log.info("Abonnement Web Push retiré (…{})", tail(endpoint));
    }

    private String tail(String endpoint) {
        return endpoint != null && endpoint.length() > 12 ? endpoint.substring(endpoint.length() - 12) : endpoint;
    }
}
