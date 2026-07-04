import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Notification } from '@core/models/notification.models';
import { NOTIFICATIONS_BY_WORKSPACE } from '@core/mock/notifications';
import { SessionService } from './session.service';

/**
 * Header notifications (workspace-scoped). Swap `NotificationsMockService` for
 * an HTTP impl when the backend is connected — components depend only on this
 * abstract class.
 */
export abstract class NotificationsService {
  abstract list(): Observable<Notification[]>;
}

@Injectable()
export class NotificationsMockService extends NotificationsService {
  private readonly session = inject(SessionService);
  list(): Observable<Notification[]> {
    return of(NOTIFICATIONS_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
}
