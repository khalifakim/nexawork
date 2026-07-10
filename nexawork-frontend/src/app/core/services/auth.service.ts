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
  /** Confirme l'adresse et **connecte** l'utilisateur (§3.5) → enchaîne workspace. */
  abstract verifyEmail(token: string): Observable<AuthResponse>;
  /** GET /invitations/{token} — contexte public (bandeau §3.2). */
  abstract getInvitation(token: string): Observable<InvitationContext>;
  /** POST /invitations/{token}/accept — crée le compte + rejoint l'espace. */
  abstract acceptInvitation(token: string, req: AcceptInvitationRequest): Observable<AuthResponse>;
  /** POST /invitations/{token}/join — compte existant (authentifié) rejoint l'espace. */
  abstract joinInvitation(token: string): Observable<AuthResponse>;
  /** PATCH /users/me/profile — prénom, nom, fonction, photo. */
  abstract updateProfile(req: { firstName?: string; lastName?: string; jobTitle?: string; photoUrl?: string }): Observable<UserProfileResponse>;
  /** PATCH /users/me/password. */
  abstract changePassword(currentPassword: string, newPassword: string): Observable<unknown>;
  /** POST /users/me/email — demande de changement (lien de confirmation envoyé). */
  abstract changeEmail(newEmail: string): Observable<unknown>;
  /** POST /auth/email/confirm-change — confirme la nouvelle adresse (sessions invalidées). */
  abstract confirmEmailChange(token: string): Observable<unknown>;
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
  verifyEmail(_t: string): Observable<AuthResponse> { return of(MOCK_AUTH_RESPONSE).pipe(delay(200)); }
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
  joinInvitation(_t: string): Observable<AuthResponse> { return of(MOCK_AUTH_RESPONSE).pipe(delay(250)); }
  updateProfile(req: { firstName?: string; lastName?: string; jobTitle?: string; photoUrl?: string }): Observable<UserProfileResponse> {
    return of({ ...MOCK_AUTH_RESPONSE.user, ...req } as UserProfileResponse).pipe(delay(150));
  }
  changePassword(_c: string, _n: string): Observable<unknown> { return of(null).pipe(delay(150)); }
  changeEmail(_e: string): Observable<unknown> { return of(null).pipe(delay(150)); }
  confirmEmailChange(_t: string): Observable<unknown> { return of(null).pipe(delay(150)); }
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
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', '/auth/verify-email', { token });
  }
  getInvitation(token: string): Observable<InvitationContext> {
    return this.get$<InvitationContext>('auth', `/invitations/${token}`);
  }
  acceptInvitation(token: string, req: AcceptInvitationRequest): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', `/invitations/${token}/accept`, req);
  }
  joinInvitation(token: string): Observable<AuthResponse> {
    return this.post$<AuthResponse>('auth', `/invitations/${token}/join`, {});
  }
  updateProfile(req: { firstName?: string; lastName?: string; jobTitle?: string; photoUrl?: string }): Observable<UserProfileResponse> {
    return this.patch$<UserProfileResponse>('auth', '/users/me/profile', req);
  }
  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.patch$<unknown>('auth', '/users/me/password', { currentPassword, newPassword });
  }
  changeEmail(newEmail: string): Observable<unknown> {
    return this.post$<unknown>('auth', '/users/me/email', { newEmail });
  }
  confirmEmailChange(token: string): Observable<unknown> {
    return this.post$<unknown>('auth', '/auth/email/confirm-change', { token });
  }
}
