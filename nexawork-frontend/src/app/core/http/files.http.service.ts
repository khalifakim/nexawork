import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environment/environment';
import { API, api } from './api.config';
import { ApiResponse } from './response.model';

/** Contexte d'upload accepté par le File Service (V5.1 §5.3). */
export type UploadContext =
  | 'avatar' | 'channel-msg' | 'conversation-msg' | 'ged' | 'task-attachment' | 'meeting-file';

/** Identifiants de contexte requis selon le bucket cible (cf. BucketRouter). */
export interface UploadParams {
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  userId?: string;
  channelId?: string;
  conversationId?: string;
  messageId?: string;
  meetingId?: string;
}

/** Fichier stocké — vue-modèle (métadonnées + URL de téléchargement stable). */
export interface StoredFile {
  id: string;
  fileName: string;
  contentType?: string;
  size?: number;
  /** Chemin relatif (indépendant de l'origine) : `apiUrl` + ce chemin = URL réelle. */
  downloadUrl: string;
}

interface StoredFileResponse {
  id: string;
  originalName: string;
  contentType?: string;
  size?: number;
}

/**
 * Client du File Service (upload multipart + URL de téléchargement). Partagé par
 * tous les domaines qui manipulent des fichiers (pièces jointes de tâches dès
 * I2b, GED et avatar en I5). Le fichier est d'abord stocké ici, puis son
 * `downloadUrl` (chemin stable) est persisté par le domaine appelant.
 */
@Injectable({ providedIn: 'root' })
export class FilesHttpService {
  private readonly http = inject(HttpClient);

  upload(context: UploadContext, file: File, params: UploadParams): Observable<StoredFile> {
    const form = new FormData();
    form.append('context', context);
    form.append('file', file);
    // Les identifiants de contexte sont liés à l'objet de commande côté serveur.
    for (const [k, v] of Object.entries(params)) {
      if (v != null) form.append(k, String(v));
    }
    return this.http.post<ApiResponse<StoredFileResponse>>(api('file', '/files'), form).pipe(
      map(r => r.payload),
      map(p => ({
        id: p.id,
        fileName: p.originalName,
        contentType: p.contentType,
        size: p.size,
        downloadUrl: `${API.file}/files/${p.id}/download`,
      })),
    );
  }

  /** Récupère le contenu binaire d'un fichier (téléchargement depuis un chemin stable). */
  download(downloadUrl: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}${downloadUrl}`, { responseType: 'blob' });
  }
}
