import { Injectable, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthActions } from '@store/auth/auth.actions';
import { selectUser } from '@store/auth/auth.selectors';
import { MOCK_AUTH_RESPONSE } from './auth.service';
import { DEFAULT_WORKSPACE_ID, WORKSPACES, findWorkspace } from '@core/mock/workspaces';
import { Workspace } from '@core/models/workspace.models';

/** Display-friendly view of the active workspace (denormalised). */
export interface ActiveWorkspaceView extends Workspace {}

/**
 * Thin façade over the auth slice used by the onboarding flow and the shell.
 * `enterWorkspace()` establishes the mock session and the auth effect then
 * routes to /app.
 *
 * Also tracks the active workspace (id + denormalised view). The id is the
 * source of truth — features query the workspace they should display by id.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly store = inject(Store);

  /** Current signed-in user (signal). */
  readonly user = toSignal(this.store.select(selectUser), { initialValue: null });

  private readonly _activeWorkspaceId = signal<string>(DEFAULT_WORKSPACE_ID);
  readonly activeWorkspaceId = this._activeWorkspaceId.asReadonly();

  /** Denormalised view of the active workspace (id-driven). */
  readonly activeWorkspace = computed<ActiveWorkspaceView>(
    () => findWorkspace(this._activeWorkspaceId()) ?? this.fallbackView()
  );

  /** All workspaces the current user belongs to. */
  readonly workspaces = computed<Workspace[]>(() => WORKSPACES);

  private fallbackView(): ActiveWorkspaceView {
    return {
      id: DEFAULT_WORKSPACE_ID,
      name: MOCK_AUTH_RESPONSE.organisationName ?? 'Mon espace',
      color: '#6C70F0',
      role: 'OWNER',
      members: 1,
    };
  }

  /** Establish the demo session and navigate into the workspace. */
  enterWorkspace(): void {
    this._activeWorkspaceId.set(DEFAULT_WORKSPACE_ID);
    this.store.dispatch(AuthActions.loginSuccess({ response: MOCK_AUTH_RESPONSE }));
  }

  /** Switch the active workspace (e.g. from the header workspace menu). */
  switchWorkspace(id: string): void {
    if (findWorkspace(id)) {
      this._activeWorkspaceId.set(id);
    }
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
