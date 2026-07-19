import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, of, timer } from 'rxjs';
import { catchError, delay, switchMap } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { SILENT } from '@core/http/http-context';
import { StompClientService } from '@core/ws/stomp-client.service';
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

/** Cadence de rafraîchissement de la présence (le TTL Redis est réarmé toutes les 20 s). */
const PRESENCE_POLL_MS = 20_000;

@Injectable()
export class MembersHttpService extends BaseHttpService implements MembersService {
  private readonly session = inject(SessionService);
  private readonly stomp = inject(StompClientService);

  /**
   * Présence Redis (`GET /presence/online`), tenue par le Notification Service :
   * une session WebSocket vaut « en ligne », réarmée par le heartbeat STOMP
   * (V5.1 §3.9). Flux **partagé** et rafraîchi périodiquement — un seul appel
   * pour tous les abonnés, et les vues suivent les connexions/déconnexions sans
   * rechargement. Un échec (jeton pas encore posé, service indisponible) vaut
   * « personne en ligne » et ne casse aucune vue.
   */
  private readonly presenceSet = new BehaviorSubject<Set<string>>(new Set<string>());
  private readonly presence$ = this.presenceSet.asObservable();

  constructor() {
    super();
    // Référence périodique (rattrape un événement manqué, amorce l'état initial).
    // Sondage de fond → silencieux (SILENT) : jamais de toast « serveur ne répond pas ».
    timer(0, PRESENCE_POLL_MS).pipe(
      switchMap(() => this.get$<string[]>('notification', '/presence/online', undefined, SILENT()).pipe(catchError(() => of<string[]>([])))),
    ).subscribe(ids => this.presenceSet.next(new Set(ids)));

    // Temps réel : connexion / déconnexion diffusées par le Notification Service.
    // Sans cela, une déconnexion n'apparaissait qu'au prochain sondage (20 s) —
    // voire seulement après un rechargement de page.
    this.stomp.watchNotifications('/topic/presence').subscribe(frame => {
      const e = JSON.parse(frame.body) as { userId: string; online: boolean };
      const next = new Set(this.presenceSet.value);
      if (e.online) next.add(e.userId); else next.delete(e.userId);
      this.presenceSet.next(next);
    });
  }

  /** Dernière présence connue — sert à teinter l'annuaire, qui doit rester « complétable ». */
  private get lastPresence(): Set<string> { return this.presenceSet.value; }

  /** Membres actifs du workspace courant (annuaire), triés par nom, présence incluse. */
  directory(): Observable<Member[]> {
    const wsId = this.session.activeWorkspaceId();
    if (!wsId) return of([]);
    return this.get$<MemberResponse[]>('auth', `/workspaces/${wsId}/members`).pipe(
      map(rs => rs.filter(r => !r.isDeactivated)
        .map(toMember)
        // Sans cette fusion, `online` restait à false partout : fiche profil,
        // en-tête de conversation, page Membres affichaient tout le monde hors ligne.
        .map(m => ({ ...m, online: !!m.userId && this.lastPresence.has(m.userId) }))
        .sort((a, b) => a.name.localeCompare(b.name))),
    );
  }

  /** Membres en ligne (hors soi) — **flux vivant** : suit la présence en continu. */
  online(): Observable<Member[]> {
    return this.directory().pipe(switchMap(dir => this.presence$.pipe(map(on => {
      const meId = this.session.user()?.id;
      return dir.filter(m => m.userId && on.has(m.userId) && m.userId !== meId)
                .map(m => ({ ...m, online: true }));
    }))));
  }

  /** Tout l'annuaire sauf soi-même. */
  others(): Observable<Member[]> {
    const meId = this.session.user()?.id;
    return this.directory().pipe(map(list => list.filter(m => m.userId !== meId)));
  }

  // `byName` / `bySlug` sont **vivants** : recombinés avec le flux de présence, ils
  // ré-émettent à chaque connexion/déconnexion. Sans ça, l'« En ligne » de la fiche
  // profil et de l'en-tête de conversation était figé à l'ouverture (`directory()`
  // ne fige la présence qu'une fois).
  byName(name: string): Observable<Member> {
    const key = name.trim().toLowerCase();
    return combineLatest([this.directory(), this.presence$]).pipe(map(([list, online]) => {
      const m = list.find(x => x.name.toLowerCase() === key)
        ?? list.find(x => x.name.toLowerCase().split(/\s+/)[0] === key)
        ?? list.find(x => x.name.toLowerCase().startsWith(key))
        ?? unknown(name);
      return m.userId ? { ...m, online: online.has(m.userId) } : m;
    }));
  }

  bySlug(slug: string): Observable<Member> {
    return combineLatest([this.directory(), this.presence$]).pipe(map(([list, online]) => {
      const m = list.find(x => slugName(x.name) === slug) ?? unknown(slug);
      return m.userId ? { ...m, online: online.has(m.userId) } : m;
    }));
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
    // La photo de profil était **purement ignorée** ici : le backend la renvoyait
    // (`MemberResponse.photoUrl`), mais elle n'atteignait aucune vue. C'est ce qui
    // rendait l'affichage des avatars impossible dans TOUTE l'application.
    photoUrl: r.photoUrl || undefined,
    online: false,       // renseigné par `online()` via la présence
    projects: [],        // « projets d'un membre » : pas d'endpoint dédié (perspective)
  };
}
