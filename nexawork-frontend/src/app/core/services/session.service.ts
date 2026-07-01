import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthActions } from '@store/auth/auth.actions';
import { selectUser } from '@store/auth/auth.selectors';
import { MOCK_AUTH_RESPONSE } from './auth.service';

/**
 * Thin façade over the auth slice used by the onboarding flow and the shell.
 * `enterWorkspace()` establishes the mock session and the auth effect then
 * routes to /app.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly store = inject(Store);

  /** Current signed-in user (signal). */
  readonly user = toSignal(this.store.select(selectUser), { initialValue: null });

  /** Establish the demo session and navigate into the workspace. */
  enterWorkspace(): void {
    this.store.dispatch(AuthActions.loginSuccess({ response: MOCK_AUTH_RESPONSE }));
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
