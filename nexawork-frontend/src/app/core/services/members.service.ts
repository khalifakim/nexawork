import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Member } from '@core/models/member.models';
import { ME, slugName } from '@core/util/ui.util';
import { MEMBERS_BY_WORKSPACE } from '@core/mock/members';
import { SessionService } from './session.service';

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
  private readonly session = inject(SessionService);

  private roster(): Member[] {
    const wsId = this.session.activeWorkspaceId();
    return MEMBERS_BY_WORKSPACE[wsId] ?? [];
  }

  directory(): Observable<Member[]> { return of(this.roster()).pipe(delay(80)); }
  online(): Observable<Member[]> { return of(this.roster().filter(m => m.online && m.name !== ME)).pipe(delay(80)); }
  others(): Observable<Member[]> { return of(this.roster().filter(m => m.name !== ME)).pipe(delay(80)); }
  byName(name: string): Observable<Member> {
    const roster = this.roster();
    const key = name.trim().toLowerCase();
    // Exact match first, then a lenient first-name / prefix match so a short
    // mention like "@Akim" still resolves to "Akim Koné".
    const found = roster.find(m => m.name.toLowerCase() === key)
      ?? roster.find(m => m.name.toLowerCase().split(/\s+/)[0] === key)
      ?? roster.find(m => m.name.toLowerCase().startsWith(key));
    return of(found ?? unknown(name));
  }
  bySlug(slug: string): Observable<Member> { return of(this.roster().find(m => slugName(m.name) === slug) ?? unknown(slug)); }
}
