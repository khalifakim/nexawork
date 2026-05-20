import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '@core/models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-auth-api-v1/api/v1/auth`;

  login(request: LoginRequest): Observable<{ data: AuthResponse }> {
    return this.http.post<{ data: AuthResponse }>(`${this.base}/login`, request);
  }

  register(request: RegisterRequest): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.base}/register`, request);
  }

  refresh(refreshToken: string): Observable<{ data: AuthResponse }> {
    return this.http.post<{ data: AuthResponse }>(`${this.base}/refresh`, {}, {
      headers: { 'X-Refresh-Token': refreshToken }
    });
  }

  logout(refreshToken: string): Observable<any> {
    return this.http.post(`${this.base}/logout`, {}, {
      headers: { 'X-Refresh-Token': refreshToken }
    });
  }

  me(): Observable<{ data: any }> {
    return this.http.get<{ data: any }>(`${this.base}/me`);
  }
}
