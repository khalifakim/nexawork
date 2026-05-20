import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from '@core/models/auth.models';

export const selectAuthState = createFeatureSelector<AuthState>('auth');
export const selectUser          = createSelector(selectAuthState, s => s.user);
export const selectToken         = createSelector(selectAuthState, s => s.token);
export const selectRefreshToken  = createSelector(selectAuthState, s => s.refreshToken);
export const selectIsAuthenticated = createSelector(selectAuthState, s => !!s.token);
export const selectAuthLoading   = createSelector(selectAuthState, s => s.loading);
export const selectAuthError     = createSelector(selectAuthState, s => s.error);
