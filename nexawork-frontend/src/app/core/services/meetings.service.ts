import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Meeting, MeetingThread } from '@core/models/meeting.models';
import { MEETINGS_BY_WORKSPACE, MEETING_THREADS, defaultMeetingThread } from '@core/mock/meetings';
import { SessionService } from './session.service';

/**
 * Meeting data (workspace-scoped). Swap `MeetingsMockService` for an HTTP impl
 * when the backend is connected — components depend only on this abstract class.
 */
export abstract class MeetingsService {
  /** Past meetings of the active workspace (history list). */
  abstract history(): Observable<Meeting[]>;
  /** Read-only discussion thread of one meeting. */
  abstract thread(id: string): Observable<MeetingThread>;
}

@Injectable()
export class MeetingsMockService extends MeetingsService {
  private readonly session = inject(SessionService);

  history(): Observable<Meeting[]> {
    const wsId = this.session.activeWorkspaceId();
    return of(MEETINGS_BY_WORKSPACE[wsId] ?? []).pipe(delay(80));
  }

  thread(id: string): Observable<MeetingThread> {
    const wsId = this.session.activeWorkspaceId();
    const meeting = (MEETINGS_BY_WORKSPACE[wsId] ?? []).find(m => m.id === id);
    return of(MEETING_THREADS[id] ?? defaultMeetingThread(id, meeting)).pipe(delay(80));
  }
}
