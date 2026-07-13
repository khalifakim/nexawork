import { Injectable, inject } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { environment } from '@environment/environment';

/**
 * Web Push (V5.1 §7.6) : enregistre le service worker, demande la permission
 * d'affichage, souscrit au push (VAPID) et transmet l'abonnement au Notification
 * Service — qui pourra alors notifier l'utilisateur même application fermée.
 *
 * L'appel est silencieux et sans effet si le navigateur ne supporte pas le push,
 * si la permission est refusée, ou en mode mock.
 */
@Injectable({ providedIn: 'root' })
export class WebPushService {
  private readonly notifs = inject(NotificationsService);

  /** Souscrit l'utilisateur courant aux notifications push (idempotent). */
  async enable(): Promise<void> {
    if (environment.mock.notifications) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!environment.vapidPublicKey) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw-push.js');

      // La permission ne peut être demandée qu'une fois ; « denied » est définitif.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(environment.vapidPublicKey),
      });

      this.notifs.subscribePush(subscription.toJSON()).subscribe({ error: () => {} });
    } catch {
      // Push indisponible (contexte non sécurisé, SW bloqué…) : on ignore.
    }
  }

  /** Retire l'abonnement push du navigateur et du serveur. */
  async disable(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    this.notifs.unsubscribePush(endpoint).subscribe({ error: () => {} });
  }
}

/** Clé VAPID base64url → `Uint8Array` attendu par `PushManager.subscribe`. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
