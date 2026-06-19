import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MeetingService } from '@core/services/meeting.service';
import { MeetingActions } from './meetings.actions';

@Injectable()
export class MeetingEffects {
  private readonly actions$ = inject(Actions);
  private readonly meetingService = inject(MeetingService);

  loadCalls$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MeetingActions.loadCalls),
      switchMap(() =>
        this.meetingService.getCalls().pipe(
          map(res => MeetingActions.loadCallsSuccess({ calls: res.data })),
          catchError(err => of(MeetingActions.loadCallsFailure({ error: err.message })))
        )
      )
    )
  );

  createCall$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MeetingActions.createCall),
      switchMap(({ request }) =>
        this.meetingService.createCall(request).pipe(
          map(res => MeetingActions.createCallSuccess({ call: res.data })),
          catchError(err => of(MeetingActions.createCallFailure({ error: err.message })))
        )
      )
    )
  );

  joinCall$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MeetingActions.joinCall),
      switchMap(({ callId }) =>
        this.meetingService.joinCall(callId).pipe(
          map(res => MeetingActions.joinCallSuccess({ call: res.data })),
          catchError(err => of(MeetingActions.joinCallFailure({ error: err.message })))
        )
      )
    )
  );
}
