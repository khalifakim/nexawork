import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  CallResponse, CallRoom, GuestInviteResponse, Meeting, MeetingThread,
} from '@core/models/meeting.models';
import { MEETINGS_BY_WORKSPACE, MEETING_THREADS, defaultMeetingThread } from '@core/mock/meetings';
import { SessionService } from './session.service';

/**
 * Meeting data (workspace-scoped). Swap `MeetingsMockService` for
 * `MeetingsHttpService` via `environment.mock.meetings`.
 */
export abstract class MeetingsService {
  /** Past meetings of the active workspace (history list). */
  abstract history(): Observable<Meeting[]>;
  /** Read-only discussion thread of one meeting. */
  abstract thread(id: string): Observable<MeetingThread>;
  /** Appels actuellement actifs et visibles par l'appelant (§14.2). */
  abstract active(): Observable<CallRoom[]>;

  /** Démarre un appel instantané (REF A : 409 si déjà en appel). */
  abstract create(topic: string, memberIds: string[]): Observable<CallRoom>;
  /** Rejoint un appel actif → coordonnées de salle (jwt à jour). */
  abstract join(id: string): Observable<CallRoom>;
  abstract leave(id: string): Observable<void>;
  /** Clôt l'appel (hôte). */
  abstract end(id: string): Observable<void>;
  /** Masque une réunion de l'historique personnel. */
  abstract hide(id: string): Observable<void>;
  /** Supprime la réunion (REF B : ADMIN/OWNER — 403 sinon). */
  abstract remove(id: string): Observable<void>;
  /** Convie des membres internes à l'appel en cours. */
  abstract inviteParticipants(id: string, userIds: string[]): Observable<void>;
  /** Invite un participant externe → lien à usage unique. */
  abstract inviteGuest(id: string, email: string, displayName: string): Observable<GuestInviteResponse>;
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
  active(): Observable<CallRoom[]> { return of([]); }
  create(topic: string, _memberIds: string[]): Observable<CallRoom> {
    return of({ id: 'mock-' + Date.now(), roomName: topic, topic, jitsiUrl: '', jwt: '' }).pipe(delay(80));
  }
  join(id: string): Observable<CallRoom> { return of({ id, roomName: id, topic: id, jitsiUrl: '', jwt: '' }); }
  leave(_id: string): Observable<void> { return of(void 0); }
  end(_id: string): Observable<void> { return of(void 0); }
  hide(_id: string): Observable<void> { return of(void 0); }
  remove(_id: string): Observable<void> { return of(void 0); }
  inviteParticipants(_id: string, _userIds: string[]): Observable<void> { return of(void 0); }
  inviteGuest(_id: string, email: string, displayName: string): Observable<GuestInviteResponse> {
    return of({ email, displayName, guestLink: '#' });
  }
}

@Injectable()
export class MeetingsHttpService extends BaseHttpService implements MeetingsService {
  private readonly session = inject(SessionService);

  history(): Observable<Meeting[]> {
    return this.get$<CallResponse[]>('meeting', '/calls').pipe(
      map(calls => calls.map(c => toMeeting(c, this.session.user()?.id))),
    );
  }

  /** Le chat persistant (M2) alimente le fil ; ici, métadonnées de la réunion. */
  thread(id: string): Observable<MeetingThread> {
    return this.get$<CallResponse>('meeting', `/calls/${id}`).pipe(map(toThread));
  }

  active(): Observable<CallRoom[]> {
    return this.get$<CallResponse[]>('meeting', '/calls/active').pipe(map(calls => calls.map(toRoom)));
  }

  create(topic: string, memberIds: string[]): Observable<CallRoom> {
    return this.post$<CallResponse>('meeting', '/calls', { topic, memberIds }).pipe(map(toRoom));
  }
  join(id: string): Observable<CallRoom> {
    return this.post$<CallResponse>('meeting', `/calls/${id}/join`, {}).pipe(map(toRoom));
  }
  leave(id: string): Observable<void> {
    return this.post$<void>('meeting', `/calls/${id}/leave`, {});
  }
  end(id: string): Observable<void> {
    return this.post$<void>('meeting', `/calls/${id}/end`, {});
  }
  hide(id: string): Observable<void> {
    return this.post$<void>('meeting', `/calls/${id}/hide`, {});
  }
  remove(id: string): Observable<void> {
    return this.delete$<void>('meeting', `/calls/${id}`);
  }
  inviteParticipants(id: string, userIds: string[]): Observable<void> {
    return this.post$<void>('meeting', `/calls/${id}/participants`, { userIds });
  }
  inviteGuest(id: string, email: string, displayName: string): Observable<GuestInviteResponse> {
    return this.post$<GuestInviteResponse>('meeting', `/calls/${id}/guests`, { email, displayName });
  }
}

// ── Mapping ──────────────────────────────────────────────────────────────────

function toRoom(c: CallResponse): CallRoom {
  return { id: c.id, roomName: c.roomName, topic: c.topic, jitsiUrl: c.jitsiUrl ?? '', jwt: c.jwt ?? '' };
}

function toMeeting(c: CallResponse, meId?: string): Meeting {
  const start = c.startedAt ? new Date(c.startedAt) : undefined;
  const end = c.endedAt ? new Date(c.endedAt) : undefined;
  const joined = c.participants.some(p => p.userId === meId && !!p.joinedAt);
  return {
    id: c.id,
    name: c.topic,
    // Une réunion est rattachée au workspace, pas à un projet (§ réunion→workspace).
    proj: 'Workspace',
    date: start ? start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    time: start ? start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
    dur: start && end ? duration(start, end) : '—',
    joined,
  };
}

function toThread(c: CallResponse): MeetingThread {
  const start = c.startedAt ? new Date(c.startedAt) : undefined;
  return {
    id: c.id,
    name: c.topic,
    proj: 'Workspace',
    date: start ? start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    docs: [],
    messages: [],
  };
}

function duration(start: Date, end: Date): string {
  const min = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r}` : `${h} h`;
}
