package com.nexawork.notification.services;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Présence « en ligne » basée sur Redis (V5.1 §3.9, §7.5). Chaque session
 * WebSocket inscrit l'utilisateur via une clé à TTL rafraîchie par heartbeat ;
 * l'expiration ou la déconnexion le retire.
 *
 * <p>Un compteur de sessions par utilisateur (multi-onglets) évite de le marquer
 * hors ligne tant qu'au moins une session reste ouverte. La clé de présence a un
 * TTL de sécurité (30 s) : si le service tombe sans nettoyer, l'utilisateur
 * disparaît automatiquement.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PresenceService {

    /** TTL de la clé de présence (V5.1 §3.9 : 30 s ; heartbeat client toutes les 20 s). */
    public static final Duration PRESENCE_TTL = Duration.ofSeconds(30);
    private static final String KEY_PREFIX = "presence:user:";

    StringRedisTemplate redis;

    /** Ouverture d'une session (connexion WebSocket) : incrémente le compteur + (ré)arme le TTL. */
    public void markOnline(UUID userId) {
        String key = key(userId);
        redis.opsForValue().increment(key);
        redis.expire(key, PRESENCE_TTL);
        log.debug("Présence : {} en ligne ({} session(s))", userId, redis.opsForValue().get(key));
    }

    /** Heartbeat : réarme le TTL sans changer le compteur. */
    public void heartbeat(UUID userId) {
        redis.expire(key(userId), PRESENCE_TTL);
    }

    /** Fermeture d'une session : décrémente ; supprime la clé si plus aucune session. */
    public void markOffline(UUID userId) {
        String key = key(userId);
        Long remaining = redis.opsForValue().decrement(key);
        if (remaining == null || remaining <= 0) {
            redis.delete(key);
            log.debug("Présence : {} hors ligne", userId);
        } else {
            redis.expire(key, PRESENCE_TTL);
        }
    }

    public boolean isOnline(UUID userId) {
        return Boolean.TRUE.equals(redis.hasKey(key(userId)));
    }

    /** Ensemble des utilisateurs actuellement en ligne (vue « En ligne »). */
    public Set<UUID> onlineUsers() {
        Set<String> keys = redis.keys(KEY_PREFIX + "*");
        if (keys == null) {
            return Set.of();
        }
        return keys.stream()
                .map(k -> k.substring(KEY_PREFIX.length()))
                .map(UUID::fromString)
                .collect(Collectors.toSet());
    }

    private String key(UUID userId) {
        return KEY_PREFIX + userId;
    }
}
