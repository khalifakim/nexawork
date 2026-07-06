import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { api, ApiService } from './api.config';
import { ApiResponse, unwrap } from './response.model';

/**
 * Socle des `*HttpService` : construit l'URL (gateway + context-path) et
 * dé-wrappe l'enveloppe `Response<T>` du backend. Chaque service de domaine
 * hérite de cette classe et se limite à décrire endpoints + mapping.
 */
@Injectable({ providedIn: 'root' })
export class BaseHttpService {

  protected readonly http = inject(HttpClient);

  protected get$<T>(service: ApiService, path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(api(service, path), { params: this.toParams(params) })
      .pipe(unwrap<T>());
  }

  protected post$<T>(service: ApiService, path: string, body?: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(api(service, path), body ?? {}).pipe(unwrap<T>());
  }

  protected patch$<T>(service: ApiService, path: string, body?: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(api(service, path), body ?? {}).pipe(unwrap<T>());
  }

  protected put$<T>(service: ApiService, path: string, body?: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(api(service, path), body ?? {}).pipe(unwrap<T>());
  }

  protected delete$<T = void>(service: ApiService, path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(api(service, path)).pipe(unwrap<T>());
  }

  /** Réponse brute (avec `metadata` de pagination) quand le service en a besoin. */
  protected getRaw$<T>(service: ApiService, path: string, params?: Record<string, string | number | boolean>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(api(service, path), { params: this.toParams(params) });
  }

  /** Téléchargement binaire (PDF, fichiers) — pas d'enveloppe. */
  protected blob$(service: ApiService, path: string): Observable<Blob> {
    return this.http.get(api(service, path), { responseType: 'blob' });
  }

  private toParams(params?: Record<string, string | number | boolean>): HttpParams | undefined {
    if (!params) return undefined;
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) hp = hp.set(k, String(v));
    }
    return hp;
  }
}
