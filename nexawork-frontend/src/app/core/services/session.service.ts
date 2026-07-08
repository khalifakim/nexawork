import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthActions } from '@store/auth/auth.actions';
import { selectRefreshToken, selectToken, selectUser } from '@store/auth/auth.selectors';
import { decodeJwt } from '@core/util/jwt.util';
import { AuthService, MOCK_AUTH_RESPONSE, MOCK_WORKSPACE_NAME } from './auth.service';
import { WorkspaceService } from './workspace.service';
import { WorkspaceLoaderService } from './workspace-loader.service';
import { DEFAULT_WORKSPACE_ID } from '@core/mock/workspaces';
import { CreateWorkspacePayload, UpdateWorkspacePayload, Workspace } from '@core/models/workspace.models';
import { environment } from '@environment/environment';

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
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly loader = inject(WorkspaceLoaderService);

  /** Current signed-in user (signal). */
  readonly user = toSignal(this.store.select(selectUser), { initialValue: null });

  private readonly _activeWorkspaceId = signal<string>(DEFAULT_WORKSPACE_ID);
  readonly activeWorkspaceId = this._activeWorkspaceId.asReadonly();

  /** Espaces de l'utilisateur — chargés depuis le backend (ou mock) via `loadWorkspaces()`. */
  private readonly _workspaces = signal<Workspace[]>([]);
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

  constructor() {
    // Réhydratation après un rechargement de page (backend réel) : le token est
    // relu du localStorage par le reducer, mais le profil et le workspace actif
    // doivent être restaurés (le claim `organisationId` du JWT + GET /users/me).
    if (!environment.mock.auth) this.restoreSession();
  }

  private restoreSession(): void {
    this.store.select(selectToken).pipe(take(1)).subscribe(token => {
      const claims = decodeJwt(token);
      if (!token || !claims) return;
      if (claims.organisationId) this._activeWorkspaceId.set(claims.organisationId);
      if (this.user()) return; // profil déjà en session (login frais)
      this.auth.me().subscribe(u => this.store.dispatch(AuthActions.loadProfileSuccess({
        user: {
          id: u.id, email: u.email, displayName: u.displayName,
          firstName: u.firstName, lastName: u.lastName, jobTitle: u.jobTitle, photoUrl: u.photoUrl,
          organisationId: claims.organisationId, orgRole: claims.orgRole,
        },
      })));
    });
  }

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
      name: MOCK_WORKSPACE_NAME,
      color: '#6C70F0',
      role: 'OWNER',
      members: 1,
    };
  }

  /**
   * Établit une session déjà scellée sur un workspace (ex. acceptation
   * d'invitation : la réponse porte le token org-scopé). Pas de `refresh`
   * supplémentaire — on entre directement dans l'app.
   */
  establishSession(response: import('@core/models/auth.models').AuthResponse): void {
    this.store.dispatch(AuthActions.refreshTokenSuccess({ response }));
    if (response.activeWorkspaceId) this._activeWorkspaceId.set(response.activeWorkspaceId);
    this.loadWorkspaces();
    this.router.navigate(['/app']);
  }

  /**
   * Établit la session après confirmation d'email (§3.5) puis route selon le
   * contexte : **aucun workspace** (fondateur) → création du 1ᵉʳ espace ;
   * un seul → entrée directe (token scellé) ; plusieurs → sélecteur.
   */
  establishSessionAfterVerification(response: import('@core/models/auth.models').AuthResponse): void {
    this.store.dispatch(AuthActions.refreshTokenSuccess({ response }));
    this.workspaceService.list().subscribe(ws => {
      this._workspaces.set(ws);
      if (ws.length === 0) {
        this.router.navigate(['/auth/workspace/name']); // fondateur : crée son espace
      } else if (ws.length === 1) {
        this._activeWorkspaceId.set(ws[0].id);
        this.scopeTokenTo(ws[0].id, () => this.router.navigate(['/app']));
      } else {
        this.router.navigate(['/auth/selector']);
      }
    });
  }

  /** Charge (ou recharge) le catalogue des espaces de l'utilisateur. */
  loadWorkspaces(): void {
    this.workspaceService.list().subscribe(ws => {
      this._workspaces.set(ws);
      // Si aucun espace actif valide, sélectionne le premier disponible.
      if (!ws.some(w => w.id === this._activeWorkspaceId()) && ws.length) {
        this._activeWorkspaceId.set(ws[0].id);
      }
    });
  }

  /**
   * Ouvrir un espace depuis le sélecteur (§3.6) : scelle le token sur ce
   * workspace (`refresh(workspaceId)` → claim `organisationId`/`orgRole`), fixe
   * l'espace actif, puis entre dans l'app. Loader plein écran pendant la bascule.
   */
  enterWorkspace(id: string): void {
    this.loader.show();
    this._activeWorkspaceId.set(id);

    if (environment.mock.auth) {
      this.store.dispatch(AuthActions.loginSuccess({ response: MOCK_AUTH_RESPONSE }));
      this.router.navigate(['/app']);
      return;
    }
    this.scopeTokenTo(id, () => this.router.navigate(['/app']));
  }

  /** Basculer l'espace actif (menu workspace du header / R19). */
  switchWorkspace(id: string, then?: () => void): void {
    if (!this._workspaces().some(w => w.id === id)) return;
    this._activeWorkspaceId.set(id);
    if (environment.mock.auth) { then?.(); return; }
    this.scopeTokenTo(id, then);
  }

  /** `refresh(refreshToken, workspaceId)` → token org-scopé, puis callback. */
  private scopeTokenTo(workspaceId: string, then?: () => void): void {
    this.store.select(selectRefreshToken).pipe(take(1)).subscribe(refreshToken => {
      if (!refreshToken) { then?.(); return; }
      this.auth.refresh({ refreshToken, workspaceId }).subscribe({
        next: response => {
          this.store.dispatch(AuthActions.refreshTokenSuccess({ response }));
          then?.();
        },
        error: () => then?.(),
      });
    });
  }

  /**
   * Créer un espace (REF I : ne bascule PAS l'espace actif). Recharge le
   * catalogue et retourne l'espace créé pour un toast / une navigation.
   */
  createWorkspace(payload: CreateWorkspacePayload, done?: (ws: Workspace) => void): void {
    this.workspaceService.create(payload).subscribe(ws => {
      this._workspaces.update(list => [...list, ws]);
      done?.(ws);
    });
  }

  /** Renommer / recolorer l'espace actif (Paramètres → Général). */
  updateActiveWorkspace(patch: UpdateWorkspacePayload): void {
    const id = this._activeWorkspaceId();
    this.workspaceService.update(id, patch).subscribe(ws =>
      this._workspaces.update(list => list.map(w => w.id === id ? { ...w, ...ws } : w)));
  }

  /**
   * R20 — quitter un workspace rejoint. `wasActive` → le composant déclenche
   * `logout()` + redirection (perte d'accès à la plateforme).
   */
  leaveWorkspace(id: string, done?: (r: { wasActive: boolean; ok: boolean }) => void): void {
    const target = this._workspaces().find(w => w.id === id);
    if (!target || target.role === 'OWNER') { done?.({ wasActive: false, ok: false }); return; }
    this.workspaceService.leave(id).subscribe({
      next: r => {
        this._workspaces.update(list => list.filter(w => w.id !== id));
        done?.({ wasActive: r.wasActive || this._activeWorkspaceId() === id, ok: true });
      },
      error: () => done?.({ wasActive: false, ok: false }),
    });
  }

  /** REF H — Supprimer le workspace actif (OWNER seul). */
  deleteActiveWorkspace(done?: (r: { ok: boolean }) => void): void {
    if (!this.isOwner()) { done?.({ ok: false }); return; }
    const id = this._activeWorkspaceId();
    this.workspaceService.remove(id).subscribe({
      next: () => {
        this._workspaces.update(list => list.filter(w => w.id !== id));
        done?.({ ok: true });
      },
      error: () => done?.({ ok: false }),
    });
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
