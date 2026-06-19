import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MessagingService } from '@core/services/messaging.service';
import { MessagingActions } from './messaging.actions';

@Injectable()
export class MessagingEffects {
  private readonly actions$ = inject(Actions);
  private readonly messagingService = inject(MessagingService);

  loadChannels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MessagingActions.loadChannels),
      switchMap(() =>
        this.messagingService.getChannels().pipe(
          map(res => MessagingActions.loadChannelsSuccess({ channels: res.data })),
          catchError(err => of(MessagingActions.loadChannelsFailure({ error: err.message })))
        )
      )
    )
  );

  loadMessages$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MessagingActions.loadMessages),
      switchMap(({ channelId }) =>
        this.messagingService.getMessages(channelId).pipe(
          map(res => MessagingActions.loadMessagesSuccess({ messages: [...res.data].reverse() })),
          catchError(err => of(MessagingActions.loadMessagesFailure({ error: err.message })))
        )
      )
    )
  );
}
