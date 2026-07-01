import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Member } from '@core/models/member.models';
import { ME, slugName } from '@core/util/ui.util';
import { MEMBERS } from '@core/mock/members';

/**
 * Members directory access. Swap `MembersMockService` for an HTTP impl when the
 * backend is connected — components depend only on this abstract class.
 */
export abstract class MembersService {
  abstract directory(): Observable<Member[]>;
  /** Online members excluding the current user. */
  abstract online(): Observable<Member[]>;
  /** All members excluding the current user. */
  abstract others(): Observable<Member[]>;
  abstract byName(name: string): Observable<Member>;
  abstract bySlug(slug: string): Observable<Member>;
}

const unknown = (name: string): Member => ({ name, color: '#86828E', role: 'Membre', email: '—', online: false, projects: [] });

@Injectable()
export class MembersMockService extends MembersService {
  directory(): Observable<Member[]> { return of(MEMBERS).pipe(delay(80)); }
  online(): Observable<Member[]> { return of(MEMBERS.filter(m => m.online && m.name !== ME)).pipe(delay(80)); }
  others(): Observable<Member[]> { return of(MEMBERS.filter(m => m.name !== ME)).pipe(delay(80)); }
  byName(name: string): Observable<Member> { return of(MEMBERS.find(m => m.name === name) ?? unknown(name)); }
  bySlug(slug: string): Observable<Member> { return of(MEMBERS.find(m => slugName(m.name) === slug) ?? unknown(slug)); }
}
