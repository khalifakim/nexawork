import { DestroyRef, Signal, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
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
): Signal<T> {
  return toSignal(
    toObservable(session.activeWorkspaceId).pipe(
      switchMap(() => factory()),
    ),
    { initialValue },
  );
}
