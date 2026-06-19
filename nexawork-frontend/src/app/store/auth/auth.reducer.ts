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
  on(AuthActions.loginSuccess, (state, { response }) => {
    localStorage.setItem('nexawork_access_token', response.accessToken);
    localStorage.setItem('nexawork_refresh_token', response.refreshToken);
    return {
      ...state,
      loading: false,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      user: {
        id: response.userId,
        email: response.email,
        displayName: response.displayName,
        organisationId: response.organisationId,
        organisationName: response.organisationName,
        orgRole: response.orgRole,
      },
    };
  }),
  on(AuthActions.loginFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(AuthActions.logout, () => {
    localStorage.removeItem('nexawork_access_token');
    localStorage.removeItem('nexawork_refresh_token');
    return { user: null, token: null, refreshToken: null, loading: false, error: null };
  }),
  on(AuthActions.loadProfileSuccess, (state, { user }) => ({ ...state, user })),
);
