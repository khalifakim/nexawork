package com.nexawork.notification.services;

import com.nexawork.notification.entities.PushSubscription;
import com.nexawork.notification.properties.PushProperties;
import jakarta.annotation.PostConstruct;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Security;

/**
 * Envoi de notifications Web Push (VAPID) via la bibliothèque
 * {@code nl.martijndwars:web-push} (V5.1 §4.7, §E.3). Best-effort asynchrone :
 * une panne d'un endpoint push ne bloque jamais la création de la notification.
 *
 * <p>Un endpoint expiré/invalide (410 Gone / 404) signale un abonnement mort ;
 * l'appelant peut alors le purger (voir {@link #isGone}).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WebPushSender {

    PushProperties properties;

    @NonFinal
    PushService pushService;

    @PostConstruct
    void init() {
        if (!properties.isEnabled()) {
            log.info("Web Push désactivé (nexawork.push.enabled=false)");
            return;
        }
        Security.addProvider(new BouncyCastleProvider());
        try {
            pushService = new PushService(
                    properties.getVapid().getPublicKey(),
                    properties.getVapid().getPrivateKey(),
                    properties.getVapid().getSubject());
            log.info("Web Push initialisé (VAPID subject={})", properties.getVapid().getSubject());
        } catch (Exception e) {
            log.error("Échec d'initialisation du Web Push (VAPID) : {}", e.getMessage());
        }
    }

    /**
     * Envoie un payload JSON à un abonnement navigateur. Renvoie le code HTTP de
     * la réponse du service push (201/200 = accepté), ou -1 en cas d'échec local.
     */
    @Async
    public void send(PushSubscription subscription, String jsonPayload) {
        if (pushService == null) {
            return;
        }
        try {
            String p256dh = subscription.getKeys().get("p256dh");
            String auth = subscription.getKeys().get("auth");
            Notification notification = new Notification(
                    subscription.getEndpoint(), p256dh, auth,
                    jsonPayload.getBytes(StandardCharsets.UTF_8));
            var response = pushService.send(notification);
            int status = response.getStatusLine().getStatusCode();
            if (status >= 200 && status < 300) {
                log.debug("Web Push envoyé (endpoint …{}) → {}", tail(subscription.getEndpoint()), status);
            } else {
                log.warn("Web Push refusé (endpoint …{}) → {}", tail(subscription.getEndpoint()), status);
            }
        } catch (Exception e) {
            log.error("Échec Web Push (endpoint …{}) : {}", tail(subscription.getEndpoint()), e.getMessage());
        }
    }

    private String tail(String endpoint) {
        return endpoint != null && endpoint.length() > 12 ? endpoint.substring(endpoint.length() - 12) : endpoint;
    }
}
