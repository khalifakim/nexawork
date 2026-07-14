import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, shareReplay } from 'rxjs';
import { MembersService } from './members.service';
import { Member } from '@core/models/member.models';

/**
 * Annuaire d'affichage des utilisateurs — **photo, nom et couleur**, par `userId`.
 *
 * Beaucoup de vues (messages d'un canal, commentaires, mentions, recherche…) ne
 * connaissent d'un utilisateur que son **UUID** : le Messaging, le Project Service
 * et le GED ne résolvent pas les noms, et encore moins les photos. Chacune se
 * débrouillait donc seule, ce qui donnait des avatars à initiales là où une photo
 * existait.
 *
 * Ce service centralise la résolution : **un seul appel** à l'annuaire, partagé
 * entre tous les abonnés (`shareReplay`), et une lecture synchrone par `userId`.
 */
@Injectable({ providedIn: 'root' })
export class AvatarDirectoryService {
  private readonly members = inject(MembersService);

  /**
   * Annuaire du workspace. Un échec ne doit casser aucune vue : on retombe sur une
   * liste vide, et les avatars affichent alors les initiales (comportement d'avant).
   */
  private readonly directory = toSignal(
    this.members.directory().pipe(
      catchError(() => of([] as Member[])),
      shareReplay({ bufferSize: 1, refCount: false }),
    ),
    { initialValue: [] as Member[] },
  );

  private readonly byId = computed(() => {
    const map = new Map<string, Member>();
    for (const m of this.directory()) {
      if (m.userId) map.set(m.userId, m);
    }
    return map;
  });

  /** Photo de profil d'un utilisateur, ou `undefined` (→ l'avatar rend les initiales). */
  photoOf(userId: string | undefined | null): string | undefined {
    if (!userId) return undefined;
    return this.byId().get(userId)?.photoUrl;
  }

  /** Nom affiché, si l'annuaire le connaît. */
  nameOf(userId: string | undefined | null): string | undefined {
    if (!userId) return undefined;
    return this.byId().get(userId)?.name;
  }

  /**
   * Photo par **nom affiché** — repli pour les vues qui n'ont que le nom (anciens
   * fils de messages, commentaires). Moins sûr qu'un UUID (deux homonymes se
   * confondraient), mais c'est parfois la seule donnée disponible.
   */
  photoOfName(name: string | undefined | null): string | undefined {
    if (!name) return undefined;
    const needle = name.trim().toLowerCase();
    for (const m of this.byId().values()) {
      if (m.name.trim().toLowerCase() === needle) return m.photoUrl;
    }
    return undefined;
  }
}
