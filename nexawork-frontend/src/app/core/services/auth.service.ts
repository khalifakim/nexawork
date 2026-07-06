import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  AcceptInvitationRequest, AuthResponse, InvitationContext, LoginRequest, RefreshRequest,
  RegisterRequest, UserProfileResponse,
} from '@core/models/auth.models';
import { BaseHttpService } from '@core/http/base-http.service';

/** Nom du workspace de démo (mock uniquement — le backend le fournit via /workspaces). */
export const MOCK_WORKSPACE_NAME = 'Atelier Nexa';

/** Session mock pour l'utilisateur de démo ("Akim Koné" — admin + owner). */
export const MOCK_AUTH_RESPONSE: AuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  activeWorkspaceId: '00000000-0000-0000-0000-000000000001',
  user: {
    id: '00000000-0000-0000-0000-0000000000a1',
    email: 'akim.kone@nexa.io',
    firstName: 'Akim',
    lastName: 'Koné',
    displayName: 'Akim Koné',
    jobTitle: 'Product Designer',
  },
};

/**
 * Contrat d'authentification (V5.1 §13.1). Deux implémentations : mock (phase
 * frontend) et HTTP (backend réel), liées dans `app.config.ts` selon
 * `environment.mock.auth`.
 */
export abstract class AuthService {
  abstract login(request: LoginRequest): Observable<AuthResponse>;
  abstract register(request: RegisterRequest): Observable<AuthResponse>;
  /** `workspaceId` optionnel : scelle le nouveau token sur ce workspace (switch §3.6). */
  abstract refresh(request: RefreshRequest): Observable<AuthResponse>;
  abstract logout(refreshToken: string): Observable<unknown>;
  abstract me(): Observable<UserProfileResponse>;
  abstract passwordResetRequest(email: string): Observable<unknown>;
  abstract passwordReset(token: string, newPassword: string): Observable<unknown>;
  abstract verifyEmail(token: string): Observable<unknown>;
  /** GET /invitations/{token} — contexte public (bandeau §3.2). */
  abstract getInvitation(token: string): Observable<InvitationContext>;
  /** POST /invitations/{token}/accept — crée le compte + rejoint l'espace. */
  abstract acceptInvitation(token: string, req: AcceptInvitationRequest): Observable<AuthResponse>;
}

@Injectable()
export class AuthMockService extends AuthService {
  login(_r: LoginRequest): Observable<AuthResponse> {
    return of(MOCK_AUTH_RESPONSE).pipe(delay(250));
  }
  register(_r: RegisterRequest): Observable<AuthResponse> {
    return of(MOCK_AUTH_RESPONSE).pipe(delay(250));
  }
  refresh(_r: RefreshRequest): Observable<AuthResponse> {
    return of(MOCK_AUTH_RESPONSE);
  }
  logout(_t: string): Observable<unknown> {
    return of(null);
  }
  me(): Observable<UserProfileResponse> {
    return of(MOCK_AUTH_RESPONSE.user);
  }
  passwordResetRequest(_e: string): Observable<unknown> { return of(null).pipe(delay(200)); }
  passwordReset(_t: string, _p: string): Observable<unknown> { return of(null).pipe(delay(200)); }
  verifyEmail(_t: string): Observable<unknown> { return of(null); }
  getInvitation(_t: string): Observable<InvitationContext> {
    const ctx: InvitationContext = {
      workspaceName: MOCK_WORKSPACE_NAME, workspaceColor: '#6C70F0',
      inviterDisplayName: 'Akim Koné', email: 'invite@nexa.io', role: 'MEMBER', memberCount: 12,
    };
    return of(ctx).pipe(delay(150));
  }
  acceptInvitation(_t: string, _r: AcceptInvitationRequest): Observable<AuthResponse> {
    return of(MOCK_AUTH_RESPONSE).pipe(delay(250));
  }
}

/** Implémentation réelle — Auth Service via la Gateway (enveloppe dé-wrappée). */
@Injectable()
export class AuthHttpService extends BaseHttpService implements AuthService {
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', '/auth/login', request);
  }
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', '/auth/register', request);
  }
  refresh(request: RefreshRequest): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', '/auth/refresh', request);
  }
  logout(refreshToken: string): Observable<unknown> {
    return this.post$<unknown>('auth', '/auth/logout', { refreshToken });
  }
  me(): Observable<UserProfileResponse> {
    return this.get$<UserProfileResponse>('auth', '/users/me');
  }
  passwordResetRequest(email: string): Observable<unknown> {
    return this.post$<unknown>('auth', '/auth/password/reset-request', { email });
  }
  passwordReset(token: string, newPassword: string): Observable<unknown> {
    return this.post$<unknown>('auth', '/auth/password/reset', { token, newPassword });
  }
  verifyEmail(token: string): Observable<unknown> {
    return this.post$<unknown>('auth', '/auth/verify-email', { token });
  }
  getInvitation(token: string): Observable<InvitationContext> {
    return this.get$<InvitationContext>('auth', `/invitations/${token}`);
  }
  acceptInvitation(token: string, req: AcceptInvitationRequest): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', `/invitations/${token}/accept`, req);
  }
}
