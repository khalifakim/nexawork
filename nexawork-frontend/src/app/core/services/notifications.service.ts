import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { api } from '@core/http/api.config';
import { ApiResponse } from '@core/http/response.model';
import { StompClientService } from '@core/ws/stomp-client.service';
import {
  Notification, NotificationKind, NotificationPageResponse, NotificationResponse, NotificationType,
} from '@core/models/notification.models';
import { NOTIFICATIONS_BY_WORKSPACE } from '@core/mock/notifications';
import { avatarColorFor } from '@core/util/ui.util';
import { SessionService } from './session.service';

/**
 * Header notifications (workspace-scoped). Swap `NotificationsMockService` for
 * `NotificationsHttpService` via `environment.mock.notifications`.
 */
export abstract class NotificationsService {
  abstract list(): Observable<Notification[]>;
  /** Flux temps réel de la file personnelle (STOMP). */
  abstract live(): Observable<Notification>;
  /** Marque une notification comme lue. */
  abstract markRead(id: string): Observable<void>;
  /** Masque une notification de la liste. */
  abstract hide(id: string): Observable<void>;
  /** Supprime définitivement une notification. */
  abstract remove(id: string): Observable<void>;
  /** Enregistre l'abonnement Web Push du navigateur. */
  abstract subscribePush(sub: PushSubscriptionJSON): Observable<void>;
  /** Retire l'abonnement Web Push. */
  abstract unsubscribePush(endpoint: string): Observable<void>;
}

@Injectable()
export class NotificationsMockService extends NotificationsService {
  private readonly session = inject(SessionService);
  list(): Observable<Notification[]> {
    return of(NOTIFICATIONS_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
  live(): Observable<Notification> { return EMPTY; }
  markRead(_id: string): Observable<void> { return of(void 0); }
  hide(_id: string): Observable<void> { return of(void 0); }
  remove(_id: string): Observable<void> { return of(void 0); }
  subscribePush(_sub: PushSubscriptionJSON): Observable<void> { return of(void 0); }
  unsubscribePush(_endpoint: string): Observable<void> { return of(void 0); }
}

/** `NotificationType` (10 valeurs backend) → `kind` d'affichage (4 icônes). */
const KIND: Record<NotificationType, NotificationKind> = {
  TASK_ASSIGNED: 'tache',
  LIVRABLE_VALIDATED: 'tache',
  MESSAGE_RECEIVED: 'message',
  MENTION: 'message',
  MEETING_INVITED: 'message',
  CALL_ENDED: 'message',
  DOCUMENT_SHARED: 'document',
  ADDED_TO_PROJECT: 'projet',
  MEMBER_INVITED: 'projet',
  EXTERNAL_GUEST_INVITED: 'projet',
};

@Injectable()
export class NotificationsHttpService extends BaseHttpService implements NotificationsService {
  private readonly stomp = inject(StompClientService);

  /**
   * Historique complet du workspace actif. La taille par défaut du serveur est de
   * 20 : au-delà, les notifications plus anciennes étaient tout simplement
   * tronquées. On demande explicitement le maximum admis (100).
   */
  list(): Observable<Notification[]> {
    return this.get$<NotificationPageResponse>('notification', '/notifications', { size: 100 })
      .pipe(map(page => (page.notifications ?? []).map(toNotification)));
  }

  /** File personnelle STOMP — le serveur route vers l'utilisateur authentifié. */
  live(): Observable<Notification> {
    return this.stomp.watchNotifications('/user/queue/notifications').pipe(
      map(frame => toNotification(JSON.parse(frame.body) as NotificationResponse)),
    );
  }

  markRead(id: string): Observable<void> {
    return this.patch$<void>('notification', `/notifications/${id}/read`, {});
  }
  hide(id: string): Observable<void> {
    return this.patch$<void>('notification', `/notifications/${id}/hide`, {});
  }
  remove(id: string): Observable<void> {
    return this.delete$<void>('notification', `/notifications/${id}`);
  }

  subscribePush(sub: PushSubscriptionJSON): Observable<void> {
    return this.post$<void>('notification', '/push/subscriptions', {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys?.['p256dh'], auth: sub.keys?.['auth'] },
    });
  }

  /** DELETE avec corps : l'endpoint à désinscrire voyage dans le body. */
  unsubscribePush(endpoint: string): Observable<void> {
    return this.http
      .request<ApiResponse<void>>('DELETE', api('notification', '/push/subscriptions'), { body: { endpoint } })
      .pipe(map(() => void 0));
  }
}

/** `NotificationResponse` (backend) → `Notification` (vue header). */
function toNotification(r: NotificationResponse): Notification {
  const actor = (r.payload?.['actorName'] as string) ?? '';
  return {
    id: r.id,
    actor,
    ac: avatarColorFor(actor || r.id),
    title: r.title,
    text: r.body ?? '',
    date: formatDate(r.createdAt),
    read: r.read,
    kind: KIND[r.type] ?? 'message',
    // Le header route à partir de `target` ; l'URL cible du backend fait foi.
    target: r.targetUrl ?? '',
    type: r.type,
    payload: r.payload,
  };
}

/** Libellé relatif court (« 3 min », « 2 h », « hier »). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "À l'instant";
  if (min < 60) return min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return h + ' h';
  const j = Math.round(h / 24);
  if (j === 1) return 'hier';
  if (j < 7) return j + ' j';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
