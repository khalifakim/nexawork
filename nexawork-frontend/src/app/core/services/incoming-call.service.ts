import { Injectable, inject, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { Notification } from '@core/models/notification.models';

/** Appel entrant affiché en modal (façon Teams / WhatsApp). */
export interface IncomingCall {
  callId: string;
  topic: string;
  /** Qui appelle (nom résolu, porté par le payload de la notification). */
  caller: string;
}

/**
 * Appels entrants. Le Notification Service pousse déjà l'invitation en temps réel
 * sur la file personnelle STOMP (`MEETING_INVITED`) : il n'y a donc aucun sondage
 * ici, on se greffe sur ce flux.
 *
 * Décliner ne ferme QUE le modal — l'appel continue de vivre pour les autres, et
 * la bannière « Appel en cours » du header (alimentée par `GET /calls/active`)
 * reste disponible pour rejoindre plus tard. C'est pourquoi les appels déclinés
 * sont mémorisés : sans cela, la notification rejouée à la reconnexion STOMP
 * ferait resurgir un modal que l'utilisateur vient d'écarter.
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

  private onNotification(n: Notification): void {
    if (n.type !== 'MEETING_INVITED') return;

    const callId = n.payload?.['callId'] as string | undefined;
    if (!callId || this.handled.has(callId)) return;

    this._incoming.set({
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
