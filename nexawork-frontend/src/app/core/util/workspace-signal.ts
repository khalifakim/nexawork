import { Signal, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SessionService } from '@core/services/session.service';

/**
 * Build a Signal that re-fetches from the given observable each time the
 * active workspace changes. Use this in components that need to display data
 * scoped to the current workspace — e.g. project lists, member rosters.
 *
 * Implementation: re-subscribes to `factory()` on every change of
 * `session.activeWorkspaceId()` via `switchMap`. Returns a read-only signal.
 *
 * Usage:
 *   private session = inject(SessionService);
 *   private projectsSvc = inject(ProjectsService);
 *   projects = workspaceSignal(
 *     this.session,
 *     () => this.projectsSvc.list(),
 *     []
 *   );
 */
export function workspaceSignal<T>(
  session: SessionService,
  factory: () => Observable<T>,
  initialValue: T,
  refresh?: Signal<unknown>,
): Signal<T> {
  // Refetch dès que l'espace actif change OU que `refresh` est bumpé (mutation
  // faite ailleurs — ex. création/archivage de projet). Voir DataRefreshService.
  const trigger = computed(() => ({ ws: session.activeWorkspaceId(), r: refresh ? refresh() : 0 }));
  return toSignal(
    toObservable(trigger).pipe(
      switchMap(() => factory()),
    ),
    { initialValue },
  );
}

/**
 * Comme {@link workspaceSignal}, mais expose aussi un signal `loading` (vrai tant
 * que la première réponse n'est pas arrivée pour l'espace/refresh courant).
 * Permet d'afficher un loader au lieu d'un écran vide pendant le chargement.
 */
export function workspaceQuery<T>(
  session: SessionService,
  factory: () => Observable<T>,
  initialValue: T,
  refresh?: Signal<unknown>,
): { value: Signal<T>; loading: Signal<boolean> } {
  const loading = signal(true);
  const trigger = computed(() => ({ ws: session.activeWorkspaceId(), r: refresh ? refresh() : 0 }));
  const value = toSignal(
    toObservable(trigger).pipe(
      tap(() => loading.set(true)),
      switchMap(() => factory()),
      tap(() => loading.set(false)),
    ),
    { initialValue },
  );
  return { value, loading: loading.asReadonly() };
}
