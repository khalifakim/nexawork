import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthResponse, LoginRequest, RegisterRequest } from '@core/models/auth.models';

/** Mock session for the current demo user ("Akim Koné" — admin + owner). */
export const MOCK_AUTH_RESPONSE: AuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  tokenType: 'Bearer',
  userId: 1,
  email: 'akim.kone@nexa.io',
  displayName: 'Akim Koné',
  organisationId: 1,
  organisationName: 'Atelier Nexa',
  orgRole: 'OWNER',
};

/**
 * Mock auth service — returns the demo session without any backend. Replaced by
 * the real HTTP implementation once the backend is connected.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  login(_request: LoginRequest): Observable<{ data: AuthResponse }> {
    return of({ data: MOCK_AUTH_RESPONSE }).pipe(delay(250));
  }

  register(_request: RegisterRequest): Observable<{ data: AuthResponse }> {
    return of({ data: MOCK_AUTH_RESPONSE }).pipe(delay(250));
  }

  refresh(_refreshToken: string): Observable<{ data: AuthResponse }> {
    return of({ data: MOCK_AUTH_RESPONSE });
  }

  logout(_refreshToken: string): Observable<unknown> {
    return of(null);
  }

  me(): Observable<{ data: AuthResponse }> {
    return of({ data: MOCK_AUTH_RESPONSE });
  }
}
