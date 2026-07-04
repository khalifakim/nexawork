import { Injectable, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthActions } from '@store/auth/auth.actions';
import { selectUser } from '@store/auth/auth.selectors';
import { MOCK_AUTH_RESPONSE } from './auth.service';
import { DEFAULT_WORKSPACE_ID, WORKSPACES } from '@core/mock/workspaces';
import { Workspace } from '@core/models/workspace.models';

/** Display-friendly view of the active workspace (denormalised). */
export interface ActiveWorkspaceView extends Workspace {}

/**
 * État d'un appel actif — modélisation frontend-first (mock).
 * Alimenté côté back par un événement WebSocket `INCOMING_CALL` accepté ou
 * un `POST /calls/{id}/join` réussi ; ici on l'expose comme un signal
 * writable que le popover et les futures actions cliquent explicitement.
 */
export interface OngoingCall {
  id: string;
  /** Réunion associée (nom court affiché en tête du popover). */
  meetingTitle: string;
  /** Contexte ("Refonte App Mobile", "Direct", "Marketing", …). */
  context: string;
  /** Timestamp d'entrée dans l'appel — sert au chronomètre. */
  startedAt: number;
}

/**
 * Thin façade over the auth slice used by the onboarding flow and the shell.
 * `enterWorkspace()` establishes the mock session and the auth effect then
 * routes to /app.
 *
 * Also tracks the active workspace (id + denormalised view). The id is the
 * source of truth — features query the workspace they should display by id.
 *
 * The workspace catalog is signal-backed so `createWorkspace()` and updates
 * from the Général settings page (name/color) propagate to every consumer.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly store = inject(Store);

  /** Current signed-in user (signal). */
  readonly user = toSignal(this.store.select(selectUser), { initialValue: null });

  private readonly _activeWorkspaceId = signal<string>(DEFAULT_WORKSPACE_ID);
  readonly activeWorkspaceId = this._activeWorkspaceId.asReadonly();

  /** All workspaces the current user belongs to (mutable via `createWorkspace`). */
  private readonly _workspaces = signal<Workspace[]>(WORKSPACES.map(w => ({ ...w })));
  readonly workspaces = this._workspaces.asReadonly();

  /** Denormalised view of the active workspace (id-driven). */
  readonly activeWorkspace = computed<ActiveWorkspaceView>(
    () => this._workspaces().find(w => w.id === this._activeWorkspaceId()) ?? this.fallbackView()
  );

  /** True when the user administrates the active workspace (owner or admin). */
  readonly isAdmin = computed<boolean>(() => {
    const role = this.activeWorkspace().role;
    return role === 'OWNER' || role === 'ADMIN';
  });

  /**
   * True when the user OWNS the active workspace (created it).
   * Only OWNER can delete the workspace and cannot be removed / demoted (REF C, REF H).
   */
  readonly isOwner = computed<boolean>(() => this.activeWorkspace().role === 'OWNER');

  /**
   * Appel en cours de l'utilisateur (REF A). `null` = pas d'appel actif.
   * Frontend-first : côté back ce signal sera alimenté par la WebSocket
   * meeting-service ; ici, `startCall()` / `endCall()` suffisent.
   */
  private readonly _ongoingCall = signal<OngoingCall | null>(null);
  readonly ongoingCall = this._ongoingCall.asReadonly();
  /**
   * REF A — vrai si l'utilisateur est déjà dans un appel. Le popover header
   * n'est monté que sur ce signal ; côté meeting-service consumer, un
   * `INCOMING_CALL` reçu alors que ce flag est vrai doit être ignoré.
   */
  readonly hasOngoingCall = computed<boolean>(() => this._ongoingCall() !== null);

  /** Démarrer un appel (rejoindre une réunion, prendre un appel entrant). */
  startCall(call: Omit<OngoingCall, 'startedAt'> & { startedAt?: number }): void {
    this._ongoingCall.set({ ...call, startedAt: call.startedAt ?? Date.now() });
  }

  /** Terminer / raccrocher l'appel courant. */
  endCall(): void {
    this._ongoingCall.set(null);
  }

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
    if (this._workspaces().some(w => w.id === id)) {
      this._activeWorkspaceId.set(id);
    }
  }

  /**
   * Create a new workspace and add it to the catalog. Does NOT switch the
   * active workspace — the user stays where they were, as specified.
   * Returns the created workspace so callers can navigate or show a toast.
   */
  createWorkspace(name: string, color: string): Workspace {
    const base = this.slugify(name) || 'espace';
    let id = base;
    let i = 2;
    const existing = this._workspaces();
    while (existing.some(w => w.id === id)) { id = `${base}-${i++}`; }
    const ws: Workspace = { id, name: name.trim(), color, role: 'OWNER', members: 1 };
    this._workspaces.update(list => [...list, ws]);
    return ws;
  }

  /** Update the current workspace's name and/or color (Paramètres → Général). */
  updateActiveWorkspace(patch: Partial<Pick<Workspace, 'name' | 'color'>>): void {
    const id = this._activeWorkspaceId();
    this._workspaces.update(list => list.map(w => w.id === id ? { ...w, ...patch } : w));
  }

  /**
   * R20 — quitter un workspace rejoint. Retire l'entrée de la liste locale.
   * Retourne `wasActive: true` si l'utilisateur vient de quitter son workspace
   * courant : dans ce cas le composant appelant est responsable de déclencher
   * `logout()` + redirection login (l'utilisateur perd tout accès à la
   * plateforme jusqu'à sa prochaine connexion).
   */
  leaveWorkspace(id: string): { wasActive: boolean; ok: boolean } {
    const list = this._workspaces();
    const target = list.find(w => w.id === id);
    if (!target || target.role === 'OWNER') return { wasActive: false, ok: false };
    const wasActive = this._activeWorkspaceId() === id;
    this._workspaces.set(list.filter(w => w.id !== id));
    return { wasActive, ok: true };
  }

  /**
   * REF H — Supprimer le workspace actif (OWNER seul). Le composant appelant
   * doit également déclencher `logout()` + redirection login puisque
   * l'utilisateur perd son workspace de session.
   */
  deleteActiveWorkspace(): { ok: boolean } {
    if (!this.isOwner()) return { ok: false };
    const id = this._activeWorkspaceId();
    this._workspaces.update(list => list.filter(w => w.id !== id));
    return { ok: true };
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  private slugify(input: string): string {
    return input.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
