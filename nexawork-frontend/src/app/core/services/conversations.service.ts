import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Conversation, ConversationMessage } from '@core/models/conversation.models';
import { CONVERSATIONS_BY_WORKSPACE, CONVERSATION_THREADS, DEFAULT_CONVERSATION_THREAD } from '@core/mock/conversations';
import { SessionService } from './session.service';

/**
 * Conversation data (workspace-scoped). Swap `ConversationsMockService` for an
 * HTTP impl when the backend is connected — components depend only on this
 * abstract class.
 */
export abstract class ConversationsService {
  /** Conversations of the active workspace (sidebar + list). */
  abstract list(): Observable<Conversation[]>;
  /** Message thread of one conversation. */
  abstract thread(id: string): Observable<ConversationMessage[]>;
  /**
   * Ids of conversations the current user has hidden. A conversation deleted
   * by the current user stays visible for the peer; when both sides delete it,
   * it is definitively removed (same visible effect in the mock).
   */
  abstract readonly deletedIds: Signal<ReadonlySet<string>>;
  /** Hide a conversation on the current user's side (soft delete). */
  abstract deleteForMe(id: string): void;
}

@Injectable()
export class ConversationsMockService extends ConversationsService {
  private readonly session = inject(SessionService);
  // Simulated: the peer has already deleted this conversation on their side.
  // When the current user also deletes it, deletion is definitive.
  private readonly _deletedByOther: ReadonlySet<string> = new Set(['equipe-design']);
  private readonly _deletedByMe = signal<ReadonlySet<string>>(new Set());
  readonly deletedIds = this._deletedByMe.asReadonly();

  list(): Observable<Conversation[]> {
    const wsId = this.session.activeWorkspaceId();
    return of(CONVERSATIONS_BY_WORKSPACE[wsId] ?? []).pipe(delay(80));
  }

  thread(id: string): Observable<ConversationMessage[]> {
    return of(CONVERSATION_THREADS[id] ?? DEFAULT_CONVERSATION_THREAD).pipe(delay(80));
  }

  deleteForMe(id: string): void {
    const next = new Set(this._deletedByMe());
    next.add(id);
    this._deletedByMe.set(next);
    // If _deletedByOther already contains this id, the deletion is definitive.
    // In the mock, visible effect is identical (hidden on this side).
  }
}
