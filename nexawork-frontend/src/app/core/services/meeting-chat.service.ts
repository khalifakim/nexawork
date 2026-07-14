import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { BaseHttpService } from '@core/http/base-http.service';
import { environment } from '@environment/environment';

/** Message du chat de réunion — vue d'affichage. */
export interface MeetingChatMessage {
  id: string;
  authorName: string;
  content: string;
  sentAt: string;
  mine: boolean;
}

interface MeetingMessageResponse {
  id: string;
  callId: string;
  authorId?: string;
  authorName: string;
  content: string;
  sentAt: string;
}

/** Fichier partagé pendant une réunion (M5). Le binaire est hébergé par JaaS. */
export interface MeetingFileResponse {
  id: string;
  callId: string;
  fileName: string;
  fileSize?: number;
  sharedBy?: string;
  sharedByName: string;
  sharedAt: string;
}

/** Métadonnées envoyées au serveur à la réception de `fileUploaded`. */
interface ShareFilePayload {
  jaasFileId: string;
  fileName: string;
  fileSize?: number;
}

/**
 * Chat de réunion persistant (M2, F5). Capte les messages échangés dans la salle
 * (via l'IFrame API JaaS) et les envoie au Meeting Service ; expose aussi le fil
 * complet pour la relecture en lecture seule après la réunion.
 */
@Injectable({ providedIn: 'root' })
export class MeetingChatService extends BaseHttpService {

  /**
   * Enregistre un message capté dans la salle. `payload` provient de l'IFrame
   * API JaaS (`incomingMessage`/`outgoingMessage`). Sans backend (mock), no-op.
   */
  capture(callId: string, payload: unknown, mine: boolean): void {
    if (environment.mock.meetings) return;
    const content = extractMessage(payload);
    if (!content.trim()) return;
    // Le sortant est déjà attribué à l'appelant côté serveur ; on n'envoie que le
    // texte. L'entrant est capté pour compléter le fil (auteur = expéditeur).
    void mine;
    this.post$<MeetingMessageResponse>('meeting', `/calls/${callId}/messages`, { content }).subscribe({
      error: () => {},
    });
  }

  /**
   * Enregistre un fichier partagé dans la salle (M5), capté via l'événement
   * `fileUploaded` de l'IFrame API JaaS. **Le binaire reste chez JaaS** : on ne
   * transmet que les métadonnées — NexaWork ne détient pas le fichier.
   *
   * L'événement est reçu par CHAQUE participant : le serveur écarte les doublons
   * sur `jaasFileId` (sinon un fichier serait enregistré autant de fois qu'il y a
   * de personnes dans la salle).
   */
  captureFile(callId: string, payload: unknown): void {
    if (environment.mock.meetings) return;
    const file = extractFile(payload);
    if (!file) return;
    this.post$<MeetingFileResponse>('meeting', `/calls/${callId}/files`, file).subscribe({
      error: () => {},
    });
  }

  /** Fichiers partagés pendant une réunion (relecture après l'appel). */
  files(callId: string): Observable<MeetingFileResponse[]> {
    if (environment.mock.meetings) return of([]);
    return this.get$<MeetingFileResponse[]>('meeting', `/calls/${callId}/files`);
  }

  /** Fil complet du chat d'une réunion (relecture après l'appel). */
  messages(callId: string, meId?: string): Observable<MeetingChatMessage[]> {
    if (environment.mock.meetings) return of([]);
    return this.get$<MeetingMessageResponse[]>('meeting', `/calls/${callId}/messages`).pipe(
      map(list => list.map(m => ({
        id: m.id,
        authorName: m.authorName,
        content: m.content,
        sentAt: m.sentAt,
        mine: !!meId && m.authorId === meId,
      }))),
    );
  }
}

/**
 * Extrait les métadonnées d'un événement `fileUploaded` de l'IFrame API JaaS.
 * Le nom exact des champs varie selon la version du tenant : on accepte les
 * variantes plutôt que de parier sur une seule, et on renonce si l'identifiant
 * manque (sans lui, impossible d'écarter les doublons).
 */
function extractFile(payload: unknown): ShareFilePayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const raw = (p['file'] && typeof p['file'] === 'object' ? p['file'] : p) as Record<string, unknown>;

  const jaasFileId = (raw['fileId'] ?? raw['id'] ?? p['fileId']) as string | undefined;
  const fileName = (raw['fileName'] ?? raw['name']) as string | undefined;
  if (!jaasFileId || !fileName) return null;

  const size = (raw['fileSize'] ?? raw['size']) as number | undefined;
  return {
    jaasFileId: String(jaasFileId),
    fileName: String(fileName),
    ...(typeof size === 'number' ? { fileSize: size } : {}),
  };
}

/** Extrait le texte d'un événement message de l'IFrame API JaaS. */
function extractMessage(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    return (p['message'] as string) ?? (p['text'] as string) ?? '';
  }
  return '';
}
