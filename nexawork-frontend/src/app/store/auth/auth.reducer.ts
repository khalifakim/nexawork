import { createReducer, on } from '@ngrx/store';
import { AuthState } from '@core/models/auth.models';
import { AuthActions } from './auth.actions';

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('nexawork_access_token'),
  refreshToken: localStorage.getItem('nexawork_refresh_token'),
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, state => ({ ...state, loading: true, error: null })),
  // loginSuccess et refreshTokenSuccess partagent la même logique : stocker les
  // tokens (rotation) et hydrater le profil depuis la réponse imbriquée.
  on(AuthActions.loginSuccess, AuthActions.refreshTokenSuccess, (state, { response }) => {
    localStorage.setItem('nexawork_access_token', response.accessToken);
    localStorage.setItem('nexawork_refresh_token', response.refreshToken);
    return {
      ...state,
      loading: false,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      user: {
        ...state.user,
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.displayName,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        jobTitle: response.user.jobTitle,
        photoUrl: response.user.photoUrl,
        organisationId: response.activeWorkspaceId ?? state.user?.organisationId,
      },
    };
  }),
  on(AuthActions.loginFailure, (state, { error }) => ({ ...state, loading: false, error })),
  // Inscription : même cycle loading/error que le login (feedback écran §3.5).
  on(AuthActions.register, state => ({ ...state, loading: true, error: null })),
  on(AuthActions.registerSuccess, state => ({ ...state, loading: false })),
  on(AuthActions.registerFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(AuthActions.logout, () => {
    localStorage.removeItem('nexawork_access_token');
    localStorage.removeItem('nexawork_refresh_token');
    return { user: null, token: null, refreshToken: null, loading: false, error: null };
  }),
  on(AuthActions.loadProfileSuccess, (state, { user }) => ({ ...state, user })),
);
