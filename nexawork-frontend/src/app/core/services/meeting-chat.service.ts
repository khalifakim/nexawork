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

/** Extrait le texte d'un événement message de l'IFrame API JaaS. */
function extractMessage(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    return (p['message'] as string) ?? (p['text'] as string) ?? '';
  }
  return '';
}
