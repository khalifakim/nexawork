export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
  organisationId?: number;
  orgRole?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  email: string;
  displayName: string;
  organisationId?: number;
  orgRole?: string;
}
