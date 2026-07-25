import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { api } from '@core/http/api.config';
import { ApiResponse, unwrap } from '@core/http/response.model';
import { PublicShareFileLine, PublicShareInfo } from '@core/models/ged.models';

/**
 * Liens de partage externes GED — surface PUBLIQUE (Brique 4). Utilisée par la page
 * `/s/:token`, atteinte SANS compte. Aucun Bearer n'est posé (voir la liste
 * `PUBLIC_PATHS` du jwt.interceptor) : seul le token du lien fait autorité, et le
 * mot de passe éventuel voyage dans l'en-tête `X-Share-Password`.
 */
@Injectable({ providedIn: 'root' })
export class PublicShareService {

  private readonly http = inject(HttpClient);

  /** Métadonnées + état du lien (rien de sensible tant qu'il est verrouillé). */
  resolve(token: string, password?: string): Observable<PublicShareInfo> {
    return this.http
      .get<ApiResponse<PublicShareInfo>>(api('ged', `/public/shares/${token}`), { headers: this.pwd(password) })
      .pipe(unwrap<PublicShareInfo>());
  }

  /** READ + cible fichier : télécharge le fichier ciblé (blob). */
  downloadTarget(token: string, password?: string): Observable<Blob> {
    return this.http.get(api('ged', `/public/shares/${token}/download`), {
      headers: this.pwd(password), responseType: 'blob',
    });
  }

  /** READ + cible dossier : télécharge un fichier du dossier partagé (blob). */
  downloadFolderFile(token: string, fileId: string, password?: string): Observable<Blob> {
    return this.http.get(api('ged', `/public/shares/${token}/files/${fileId}/download`), {
      headers: this.pwd(password), responseType: 'blob',
    });
  }

  /** DROP : dépôt d'un fichier par un externe (identité déclarée : nom + email). */
  upload(token: string, file: File, name: string, email: string, password?: string): Observable<PublicShareFileLine> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    if (email) form.append('email', email);
    return this.http
      .post<ApiResponse<PublicShareFileLine>>(api('ged', `/public/shares/${token}/upload`), form, { headers: this.pwd(password) })
      .pipe(unwrap<PublicShareFileLine>());
  }

  private pwd(password?: string): HttpHeaders | undefined {
    return password ? new HttpHeaders({ 'X-Share-Password': password }) : undefined;
  }
}
