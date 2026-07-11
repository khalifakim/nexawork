import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { Member, MemberResponse } from '@core/models/member.models';
import { ME, slugName, avatarColorFor } from '@core/util/ui.util';
import { MEMBERS_BY_WORKSPACE } from '@core/mock/members';
import { SessionService } from './session.service';

/**
 * Members directory access. Swap `MembersMockService` for `MembersHttpService`
 * via `environment.mock.members` — components depend only on this abstract class.
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

/** Libellé de rôle affiché à défaut de fonction métier renseignée. */
const ORG_ROLE_LABEL: Record<MemberResponse['orgRole'], string> = {
  OWNER: 'Propriétaire', ADMIN: 'Administrateur', MEMBER: 'Membre',
};

@Injectable()
export class MembersHttpService extends BaseHttpService implements MembersService {
  private readonly session = inject(SessionService);

  /** Membres actifs du workspace courant (annuaire), triés par nom. */
  directory(): Observable<Member[]> {
    const wsId = this.session.activeWorkspaceId();
    if (!wsId) return of([]);
    return this.get$<MemberResponse[]>('auth', `/workspaces/${wsId}/members`).pipe(
      map(rs => rs.filter(r => !r.isDeactivated).map(toMember).sort((a, b) => a.name.localeCompare(b.name))),
    );
  }

  /**
   * Membres en ligne (hors soi). Croise l'annuaire avec la présence Redis.
   * NB : `GET /presence/active` renvoie une liste vide tant que la présence
   * temps réel (WebSocket) n'est pas active — « En ligne » sera donc vide.
   */
  online(): Observable<Member[]> {
    return forkJoin({
      dir: this.directory(),
      active: this.get$<string[]>('messaging', '/presence/active'),
    }).pipe(
      map(({ dir, active }) => {
        const on = new Set(active);
        const meId = this.session.user()?.id;
        return dir.filter(m => m.userId && on.has(m.userId) && m.userId !== meId)
                  .map(m => ({ ...m, online: true }));
      }),
    );
  }

  /** Tout l'annuaire sauf soi-même. */
  others(): Observable<Member[]> {
    const meId = this.session.user()?.id;
    return this.directory().pipe(map(list => list.filter(m => m.userId !== meId)));
  }

  byName(name: string): Observable<Member> {
    const key = name.trim().toLowerCase();
    return this.directory().pipe(map(list =>
      list.find(m => m.name.toLowerCase() === key)
      ?? list.find(m => m.name.toLowerCase().split(/\s+/)[0] === key)
      ?? list.find(m => m.name.toLowerCase().startsWith(key))
      ?? unknown(name),
    ));
  }

  bySlug(slug: string): Observable<Member> {
    return this.directory().pipe(map(list => list.find(m => slugName(m.name) === slug) ?? unknown(slug)));
  }
}

/** `MemberResponse` (Auth) → `Member` (view-model annuaire). */
function toMember(r: MemberResponse): Member {
  return {
    userId: r.userId,
    name: r.displayName,
    color: avatarColorFor(r.userId),
    role: r.jobTitle?.trim() || ORG_ROLE_LABEL[r.orgRole],
    email: r.email,
    online: false,       // renseigné par `online()` via la présence
    projects: [],        // « projets d'un membre » : pas d'endpoint dédié (perspective)
  };
}
