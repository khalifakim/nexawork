import { Injectable, Signal, inject, signal } from '@angular/core';
import { EMPTY, Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { StompClientService } from '@core/ws/stomp-client.service';
import { Conversation, ConversationMessage, ConversationResponse } from '@core/models/conversation.models';
import { MessageResponse } from '@core/models/channel.models';
import { CONVERSATIONS_BY_WORKSPACE, CONVERSATION_THREADS, DEFAULT_CONVERSATION_THREAD } from '@core/mock/conversations';
import { parseRichText } from '@core/util/mention.util';
import { avatarColorFor, initials, slugName } from '@core/util/ui.util';
import { SessionService } from './session.service';
import { MembersService } from './members.service';
import { Member } from '@core/models/member.models';

/**
 * Conversation data (workspace-scoped). Swap `ConversationsMockService` for
 * `ConversationsHttpService` via `environment.mock.conversations`.
 */
export abstract class ConversationsService {
  /** Conversations of the active workspace (sidebar + list). */
  abstract list(): Observable<Conversation[]>;
  /** Message thread of one conversation (by peer slug). */
  abstract thread(id: string): Observable<ConversationMessage[]>;
  /** Live stream of new messages of one conversation (STOMP). */
  abstract live(id: string): Observable<ConversationMessage>;
  /** Send a text message to the peer identified by the route slug. */
  abstract sendMessage(id: string, content: string): Observable<void>;
  /** Marque comme lus les messages reçus de la conversation. */
  abstract markRead(id: string): void;
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
  live(_id: string): Observable<ConversationMessage> { return EMPTY; }
  sendMessage(_id: string, _content: string): Observable<void> { return of(void 0); }
  markRead(_id: string): void { /* no-op en mock */ }
  deleteForMe(id: string): void {
    const next = new Set(this._deletedByMe());
    next.add(id);
    this._deletedByMe.set(next);
  }
}

@Injectable()
export class ConversationsHttpService extends BaseHttpService implements ConversationsService {
  private readonly session = inject(SessionService);
  private readonly members = inject(MembersService);
  private readonly stomp = inject(StompClientService);

  /** Conversations courantes indexées par slug du pair. */
  private readonly cache = signal<Map<string, Conversation>>(new Map());
  private readonly _deletedByMe = signal<ReadonlySet<string>>(new Set());
  readonly deletedIds = this._deletedByMe.asReadonly();

  list(): Observable<Conversation[]> {
    return forkJoin({
      convs: this.get$<ConversationResponse[]>('messaging', '/conversations'),
      dir: this.members.directory(),
    }).pipe(map(({ convs, dir }) => {
      const meId = this.session.user()?.id;
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      const list = convs.map(c => toConversation(c, meId, byId)).filter((c): c is Conversation => !!c);
      this.cache.set(new Map(list.map(c => [c.id, c])));
      return list;
    }));
  }

  thread(id: string): Observable<ConversationMessage[]> {
    return this.resolveConversation(id).pipe(switchMap(conv => {
      if (!conv?.uuid) return of<ConversationMessage[]>([]);
      return forkJoin({
        page: this.get$<{ messages: MessageResponse[] }>('messaging', `/conversations/${conv.uuid}/messages`),
        dir: this.members.directory(),
      }).pipe(map(({ page, dir }) => {
        const meId = this.session.user()?.id;
        const byId = new Map(dir.map(m => [m.userId, m]));
        return page.messages.map(msg => toConversationMessage(msg, meId, byId));
      }));
    }));
  }

  live(id: string): Observable<ConversationMessage> {
    return this.resolveConversation(id).pipe(switchMap(conv => {
      if (!conv?.uuid) return EMPTY;
      const meId = this.session.user()?.id;
      return this.members.directory().pipe(switchMap(dir => {
        const byId = new Map(dir.map(m => [m.userId, m]));
        return this.stomp.watch(`/topic/conversations/${conv.uuid}`).pipe(
          map(frame => toConversationMessage(JSON.parse(frame.body) as MessageResponse, meId, byId)),
        );
      }));
    }));
  }

  sendMessage(id: string, content: string): Observable<void> {
    if (!content.trim()) return of(void 0);
    return this.ensureConversation(id).pipe(switchMap(conv => {
      if (!conv?.uuid) return of(void 0);
      return this.post$<MessageResponse>('messaging', `/conversations/${conv.uuid}/messages`, { content }).pipe(map(() => void 0));
    }));
  }

  markRead(id: string): void {
    // Efface le badge « non lu » localement à l'ouverture. L'accusé de lecture
    // serveur se fait par message (`PATCH /messages/{id}/read`) ; il sera émis
    // à la réception de chaque message quand le flux STOMP portera les ids —
    // différé ici pour éviter un aller-retour par message à l'ouverture.
    const conv = this.cache().get(id);
    if (conv && conv.unread > 0) {
      this.cache.update(m => {
        const next = new Map(m);
        next.set(id, { ...conv, unread: 0 });
        return next;
      });
    }
  }

  deleteForMe(id: string): void {
    const next = new Set(this._deletedByMe());
    next.add(id);
    this._deletedByMe.set(next);
    const conv = this.cache().get(id);
    if (conv?.uuid) this.delete$<void>('messaging', `/conversations/${conv.uuid}`).subscribe({ error: () => {} });
  }

  /** Retrouve la conversation existante (cache, sinon recharge la liste). */
  private resolveConversation(slug: string): Observable<Conversation | undefined> {
    const known = this.cache().get(slug);
    if (known) return of(known);
    return this.list().pipe(map(() => this.cache().get(slug)));
  }

  /** Comme `resolveConversation`, mais crée la conversation si elle n'existe pas. */
  private ensureConversation(slug: string): Observable<Conversation | undefined> {
    return this.resolveConversation(slug).pipe(switchMap(conv => {
      if (conv?.uuid) return of(conv);
      // Pas encore de conversation : la créer à partir du pair (résolu par slug).
      return this.members.bySlug(slug).pipe(switchMap(peer => {
        if (!peer.userId) return of(undefined);
        return this.post$<ConversationResponse>('messaging', '/conversations', { userId: peer.userId }).pipe(
          switchMap(() => this.list().pipe(map(() => this.cache().get(slug)))),
        );
      }));
    }));
  }
}

/** `ConversationResponse` → `Conversation` (id = slug du pair). */
function toConversation(c: ConversationResponse, meId: string | undefined, byId: Map<string, Member>): Conversation | null {
  const peerId = c.participantUserIds.find(u => u !== meId);
  if (!peerId) return null;
  const peer = byId.get(peerId);
  const name = peer?.name ?? 'Membre';
  return {
    id: slugName(name),
    name,
    color: peer?.color ?? avatarColorFor(peerId),
    initials: initials(name),
    msg: '',
    unread: c.isRead ? 0 : 1,
    time: '',
    uuid: c.id,
    peerUserId: peerId,
  };
}

/** `MessageResponse` → `ConversationMessage`. */
function toConversationMessage(msg: MessageResponse, meId: string | undefined, _byId: Map<string | undefined, unknown>): ConversationMessage {
  const mine = msg.senderUserId === meId;
  const files = msg.attachmentUrl ? [{ id: 1, name: msg.attachmentName ?? 'fichier', size: 0 }] : undefined;
  return {
    me: mine,
    parts: parseRichText(msg.content),
    time: formatTime(msg.sentAt),
    read: mine ? !!msg.readAt : undefined,
    files,
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
