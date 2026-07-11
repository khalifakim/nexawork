import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Store } from '@ngrx/store';
import { selectToken } from '@store/auth/auth.selectors';
import { environment } from '@environment/environment';

/**
 * Client STOMP partagé (messagerie temps réel). Une seule connexion WebSocket
 * vers la Gateway (`environment.wsMessagingUrl`), multiplexée par destination.
 *
 * - Connexion paresseuse : établie au premier `subscribe`, réutilisée ensuite.
 * - Le jeton d'accès est passé en en-tête de connexion (`Authorization: Bearer`)
 *   — la Gateway l'exploite pour poser l'identité côté serveur.
 * - Reconnexion automatique (délai fixe) ; les abonnements actifs sont réappliqués.
 */
@Injectable({ providedIn: 'root' })
export class StompClientService {
  private readonly store = inject(Store);

  private client?: Client;
  private accessToken: string | null = null;
  /** Un Subject par destination (`/topic/...`), partagé entre abonnés. */
  private readonly streams = new Map<string, Subject<IMessage>>();
  private readonly subs = new Map<string, StompSubscription>();

  constructor() {
    // Garde le dernier jeton connu pour le handshake / la reconnexion.
    this.store.select(selectToken).subscribe(t => (this.accessToken = t ?? null));
  }

  /** Flux des messages d'une destination STOMP. L'abonnement réseau est paresseux. */
  watch(destination: string): Observable<IMessage> {
    let subject = this.streams.get(destination);
    if (!subject) {
      subject = new Subject<IMessage>();
      this.streams.set(destination, subject);
    }
    this.ensureConnected();
    this.subscribeIfPossible(destination);
    return subject.asObservable();
  }

  /** Publie un message sur une destination applicative (`/app/...`). */
  publish(destination: string, body: unknown): void {
    this.ensureConnected();
    this.client?.publish({ destination, body: JSON.stringify(body) });
  }

  // ── Interne ─────────────────────────────────────────────────────────────────
  private ensureConnected(): void {
    if (this.client) return;
    this.client = new Client({
      brokerURL: this.toWsUrl(environment.wsMessagingUrl),
      connectHeaders: this.authHeaders(),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        // Réapplique tous les abonnements en attente / perdus à la (re)connexion.
        for (const dest of this.streams.keys()) this.subscribeIfPossible(dest);
      },
    });
    this.client.activate();
  }

  private subscribeIfPossible(destination: string): void {
    if (!this.client?.connected || this.subs.has(destination)) return;
    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      this.streams.get(destination)?.next(msg);
    });
    this.subs.set(destination, sub);
  }

  private authHeaders(): Record<string, string> {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
  }

  /** `http(s)://host/ws/...` → `ws(s)://host/ws/...` pour le broker STOMP natif. */
  private toWsUrl(url: string): string {
    if (url.startsWith('ws')) return url;
    if (url.startsWith('https')) return 'wss' + url.slice(5);
    if (url.startsWith('http')) return 'ws' + url.slice(4);
    // URL relative (prod, même origine) : préfixe selon le protocole courant.
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
