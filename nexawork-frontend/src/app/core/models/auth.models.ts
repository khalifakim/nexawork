/**
 * Modèles d'authentification alignés sur le backend Auth Service (V5.1 §13.1).
 * Tous les identifiants sont des **UUID (string)**.
 */

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

/** Profil en session (state NgRx). `organisationId` = workspace actif. */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  photoUrl?: string;
  organisationId?: string;
  organisationName?: string;
  orgRole?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /auth/register — le backend attend prénom + nom (displayName est dérivé). */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  jobTitle?: string;
}

/** POST /auth/refresh — `workspaceId` scelle le token sur un workspace (switch). */
export interface RefreshRequest {
  refreshToken: string;
  workspaceId?: string;
}

/** Profil renvoyé par le backend (imbriqué dans AuthResponse, ou GET /users/me). */
export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle?: string;
  photoUrl?: string;
  emailVerified?: boolean;
  isActive?: boolean;
}

/**
 * Réponse réelle du backend : `{accessToken, refreshToken, activeWorkspaceId, user}`.
 * Le contexte workspace (organisationId/orgRole) est porté par le JWT après un
 * `refresh(workspaceId)` — pas par le login initial.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  activeWorkspaceId?: string | null;
  user: UserProfileResponse;
}
