import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';
import { NotificationActions } from './notifications.actions';

@Injectable()
export class NotificationEffects {
  private readonly actions$ = inject(Actions);
  private readonly notificationService = inject(NotificationService);

  loadNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.loadNotifications),
      switchMap(() =>
        this.notificationService.getAll().pipe(
          map(res => NotificationActions.loadNotificationsSuccess({ notifications: res.data })),
          catchError(err => of(NotificationActions.loadNotificationsFailure({ error: err.message })))
        )
      )
    )
  );

  loadUnreadCount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.loadUnreadCount),
      switchMap(() =>
        this.notificationService.getUnreadCount().pipe(
          map(res => NotificationActions.loadUnreadCountSuccess({ count: res.data })),
          catchError(() => of())
        )
      )
    )
  );

  markAllRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.markAllRead),
      switchMap(() =>
        this.notificationService.markAllAsRead().pipe(
          map(() => NotificationActions.markAllReadSuccess()),
          catchError(() => of())
        )
      )
    )
  );
}
