import { Injectable, inject, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { Notification } from '@core/models/notification.models';

/**
 * Libellé de repli quand l'invitant n'est pas connu — le sondage `/calls/active`
 * ne porte pas les noms (le Meeting Service ne les résout pas). On ne l'invente pas.
 */
export const GENERIC_CALLER = 'Un membre';

/** Appel entrant affiché en modal (façon Teams / WhatsApp). */
export interface IncomingCall {
  callId: string;
  topic: string;
  /** Qui appelle (nom résolu, porté par le payload de la notification). */
  caller: string;
}

/**
 * Appels entrants (modal façon Teams / WhatsApp). **Deux sources**, et c'est
 * délibéré :
 *
 * 1. la **notification STOMP** `MEETING_INVITED` — instantanée, avec le nom de
 *    l'appelant ;
 * 2. le **sondage `GET /calls/active`** du header, relayé ici par {@link offer}.
 *
 * La seconde est un **filet indispensable** : une trame STOMP ne se rattrape pas.
 * Si la WebSocket était coupée, en reconnexion, ou si l'utilisateur ouvre
 * l'application *après* l'invitation, la notification est perdue à jamais et le
 * modal n'apparaîtrait **jamais** — seule la pastille du header le trahirait.
 * C'était exactement le symptôme observé.
 *
 * Décliner ne ferme QUE le modal — l'appel continue de vivre pour les autres, et
 * la bannière « Appel en cours » reste disponible pour rejoindre plus tard. Les
 * appels écartés sont mémorisés : sans cela, le sondage (toutes les 15 s) ferait
 * resurgir en boucle un modal que l'utilisateur vient de refuser.
 */
@Injectable({ providedIn: 'root' })
export class IncomingCallService {
  private readonly notifications = inject(NotificationsService);

  private readonly _incoming = signal<IncomingCall | null>(null);
  readonly incoming = this._incoming.asReadonly();

  /** Appels déjà écartés ou rejoints — on ne represente plus leur modal. */
  private readonly handled = new Set<string>();

  constructor() {
    this.notifications.live().subscribe(n => this.onNotification(n));
  }

  /**
   * Un appel actif auquel on est convié vient d'être détecté (sondage du header).
   * Ne fait rien s'il est déjà à l'écran, ou s'il a été écarté. L'hôte est exclu
   * par l'appelant : on ne s'auto-appelle pas.
   */
  offer(call: IncomingCall): void {
    if (this.handled.has(call.callId)) return;

    const current = this._incoming();
    if (current?.callId === call.callId) {
      // Déjà à l'écran. Le sondage ne connaît pas le nom de l'invitant (« Un
      // membre ») ; si la notification STOMP l'apporte ensuite, on l'affiche —
      // mais on ne redescend jamais vers le libellé générique.
      if (call.caller !== GENERIC_CALLER && current.caller === GENERIC_CALLER) {
        this._incoming.set(call);
      }
      return;
    }
    this._incoming.set(call);
  }

  private onNotification(n: Notification): void {
    if (n.type !== 'MEETING_INVITED') return;

    const callId = n.payload?.['callId'] as string | undefined;
    if (!callId) return;

    this.offer({
      callId,
      topic: (n.payload?.['topic'] as string) || 'Réunion',
      caller: (n.payload?.['actorName'] as string) || n.actor || 'Un membre',
    });
  }

  /** Décline : ferme le modal, sans toucher à l'appel lui-même. */
  dismiss(): void {
    const call = this._incoming();
    if (call) this.handled.add(call.callId);
    this._incoming.set(null);
  }

  /** L'appel a été rejoint : le modal ne doit plus reparaître. */
  accepted(): void {
    this.dismiss();
  }
}
