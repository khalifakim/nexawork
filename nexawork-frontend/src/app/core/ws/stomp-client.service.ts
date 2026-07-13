import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Store } from '@ngrx/store';
import { selectToken } from '@store/auth/auth.selectors';
import { environment } from '@environment/environment';

/** Une connexion STOMP vers un endpoint (messagerie ou notifications). */
class StompConnection {
  private client?: Client;
  private readonly streams = new Map<string, Subject<IMessage>>();
  private readonly subs = new Map<string, StompSubscription>();

  constructor(
    private readonly url: string,
    private readonly token: () => string | null,
    /** Appelé à chaque (re)connexion — sert au heartbeat de présence. */
    private readonly onConnected?: (c: StompConnection) => void,
  ) {}

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

  publish(destination: string, body: unknown): void {
    this.ensureConnected();
    this.client?.publish({ destination, body: JSON.stringify(body) });
  }

  get connected(): boolean { return !!this.client?.connected; }

  private ensureConnected(): void {
    if (this.client) return;
    this.client = new Client({
      // `webSocketFactory` (et non `brokerURL`) : l'URL est reconstruite à CHAQUE
      // (re)connexion, avec le jeton courant — après un refresh, un `brokerURL`
      // figé rouvrirait la socket avec un jeton périmé.
      webSocketFactory: () => new WebSocket(this.socketUrl()),
      connectHeaders: this.authHeaders(),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        // Réapplique tous les abonnements en attente / perdus à la (re)connexion.
        for (const dest of this.streams.keys()) this.subscribeIfPossible(dest);
        this.onConnected?.(this);
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
    const t = this.token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  /**
   * URL du handshake, jeton compris. Le gateway laisse le handshake public (un
   * WebSocket natif ne peut pas porter d'en-tête `Authorization`) mais lit
   * `access_token` pour propager l'identité aux services — sans quoi la session
   * STOMP n'a pas de Principal : ni file privée de notifications, ni présence.
   */
  private socketUrl(): string {
    const base = toWsUrl(this.url);
    const t = this.token();
    if (!t) return base;
    return base + (base.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(t);
  }
}

/** `http(s)://host/ws/...` → `ws(s)://host/ws/...` pour le broker STOMP natif. */
function toWsUrl(url: string): string {
  if (url.startsWith('ws')) return url;
  if (url.startsWith('https')) return 'wss' + url.slice(5);
  if (url.startsWith('http')) return 'ws' + url.slice(4);
  // URL relative (prod, même origine) : préfixe selon le protocole courant.
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Heartbeat de présence (V5.1 §3.9) — réarme le TTL Redis côté serveur. */
const PRESENCE_HEARTBEAT_MS = 20_000;

/**
 * Clients STOMP partagés. Deux connexions distinctes, établies paresseusement :
 * - **messagerie** (`/ws/messaging`) : canaux et conversations ;
 * - **notifications** (`/ws/notifications`) : file personnelle + heartbeat de présence.
 *
 * Le jeton d'accès est passé en en-tête de connexion ; reconnexion automatique
 * avec réapplication des abonnements.
 */
@Injectable({ providedIn: 'root' })
export class StompClientService {
  private readonly store = inject(Store);
  private accessToken: string | null = null;

  private messaging?: StompConnection;
  private notifications?: StompConnection;
  private heartbeat?: ReturnType<typeof setInterval>;

  constructor() {
    // Garde le dernier jeton connu pour le handshake / la reconnexion.
    this.store.select(selectToken).subscribe(t => (this.accessToken = t ?? null));
  }

  // ── Messagerie (canaux / conversations) ─────────────────────────────────────
  /** Flux des messages d'une destination STOMP. L'abonnement réseau est paresseux. */
  watch(destination: string): Observable<IMessage> {
    return this.messagingConn().watch(destination);
  }

  /** Publie un message sur une destination applicative (`/app/...`). */
  publish(destination: string, body: unknown): void {
    this.messagingConn().publish(destination, body);
  }

  // ── Notifications (file personnelle + présence) ─────────────────────────────
  /** Flux de la file personnelle de notifications (`/user/queue/notifications`). */
  watchNotifications(destination: string): Observable<IMessage> {
    return this.notificationsConn().watch(destination);
  }

  private messagingConn(): StompConnection {
    this.messaging ??= new StompConnection(environment.wsMessagingUrl, () => this.accessToken);
    return this.messaging;
  }

  private notificationsConn(): StompConnection {
    this.notifications ??= new StompConnection(
      environment.wsNotificationUrl,
      () => this.accessToken,
      conn => this.startHeartbeat(conn),
    );
    return this.notifications;
  }

  /**
   * Démarre le heartbeat de présence sur la connexion notifications : la
   * connexion WebSocket vaut « en ligne », et un battement périodique réarme le
   * TTL de la clé Redis (`/app/presence/heartbeat`).
   */
  private startHeartbeat(conn: StompConnection): void {
    clearInterval(this.heartbeat);
    conn.publish('/app/presence/heartbeat', {});
    this.heartbeat = setInterval(() => {
      if (conn.connected) conn.publish('/app/presence/heartbeat', {});
    }, PRESENCE_HEARTBEAT_MS);
  }
}
