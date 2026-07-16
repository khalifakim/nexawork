import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { delay, filter, tap } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { SILENT } from '@core/http/http-context';
import { FilesHttpService } from '@core/http/files.http.service';
import { StompClientService } from '@core/ws/stomp-client.service';
import { Conversation, ConversationMessage, ConversationResponse } from '@core/models/conversation.models';
import { MessageResponse } from '@core/models/channel.models';
import { messageBody, messageFiles } from './channels.service';
import { MentionRef } from '@core/models/mention.models';
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
  /**
   * Vue réactive des conversations courantes. À la différence de `list()` (un
   * fetch), ce signal reflète les mutations d'état de lecture : ouvrir une
   * conversation vide son badge **sans rechargement** (la sidebar la lit).
   */
  abstract readonly items: Signal<Conversation[]>;
  /** Message thread of one conversation (by peer slug). */
  abstract thread(id: string): Observable<ConversationMessage[]>;
  /** Live stream of new messages of one conversation (STOMP). */
  abstract live(id: string): Observable<ConversationMessage>;
  /**
   * Send a message to the peer identified by the route slug, with optional file
   * attachments (téléversées au File Service puis rattachées, une par message).
   */
  abstract sendMessage(id: string, content: string, files?: File[], mentions?: MentionRef[]): Observable<void>;
  /** Marque comme lus les messages reçus de la conversation. */
  abstract markRead(id: string): void;
  /** Accusé de lecture d'un message reçu (`PATCH /messages/{id}/read`) — temps réel. */
  abstract markMessageRead(messageId: string): void;
  /** Signale au pair que je suis (ou non) en train d'écrire (STOMP, volatile). */
  abstract sendTyping(id: string, typing: boolean): void;
  /** Flux « le pair est en train d'écrire » (true/false) — temps réel. */
  abstract typing(id: string): Observable<boolean>;
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
  private readonly _items = signal<Conversation[]>([]);
  readonly items = this._items.asReadonly();

  list(): Observable<Conversation[]> {
    const wsId = this.session.activeWorkspaceId();
    return of(CONVERSATIONS_BY_WORKSPACE[wsId] ?? []).pipe(delay(80), tap(l => this._items.set(l)));
  }
  thread(id: string): Observable<ConversationMessage[]> {
    return of(CONVERSATION_THREADS[id] ?? DEFAULT_CONVERSATION_THREAD).pipe(delay(80));
  }
  live(_id: string): Observable<ConversationMessage> { return EMPTY; }
  sendMessage(_id: string, _content: string, _files?: File[], _mentions?: MentionRef[]): Observable<void> { return of(void 0); }
  markRead(id: string): void {
    this._items.update(list => list.map(c => c.id === id ? { ...c, unread: 0 } : c));
  }
  markMessageRead(_messageId: string): void { /* no-op en mock */ }
  sendTyping(_id: string, _typing: boolean): void { /* no-op en mock */ }
  typing(_id: string): Observable<boolean> { return EMPTY; }
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
  private readonly filesSvc = inject(FilesHttpService);

  /** Conversations courantes indexées par slug du pair. */
  private readonly cache = signal<Map<string, Conversation>>(new Map());
  /** Vue réactive : `markRead` mute le cache → la sidebar vide le badge sans recharger. */
  readonly items = computed(() => [...this.cache().values()]);
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
        // Le backend pagine du plus récent au plus ancien (curseur) : on ré-inverse
        // pour l'affichage chronologique (anciens en haut, nouveaux en bas).
        return page.messages.map(msg => toConversationMessage(msg, meId, byId)).reverse();
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

  sendMessage(id: string, content: string, files: File[] = [], mentions: MentionRef[] = []): Observable<void> {
    const text = content.trim();
    if (!text && files.length === 0) return of(void 0);
    return this.ensureConversation(id).pipe(switchMap(conv => {
      if (!conv?.uuid) return of(void 0);
      const endpoint = `/conversations/${conv.uuid}/messages`;
      if (files.length === 0) {
        return this.post$<MessageResponse>('messaging', endpoint, { content: text, mentions }).pipe(map(() => void 0));
      }
      // Téléverse tous les fichiers puis envoie UN SEUL message qui les porte tous.
      const workspaceId = this.session.activeWorkspaceId();
      return forkJoin(files.map(f => this.filesSvc.upload('conversation-msg', f, { workspaceId, conversationId: conv.uuid })))
        .pipe(switchMap(stored =>
          this.post$<MessageResponse>('messaging', endpoint, messageBody(text, stored, mentions)).pipe(map(() => void 0))));
    }));
  }

  /**
   * Publie l'indicateur de saisie sur `/app/conversations/{uuid}/typing`.
   * Volatile : aucun stockage, simple rediffusion aux abonnés du topic.
   */
  sendTyping(id: string, typing: boolean): void {
    const conv = this.cache().get(id);
    if (conv?.uuid) this.stomp.publish(`/app/conversations/${conv.uuid}/typing`, { typing });
  }

  /** Flux « le pair écrit » : ignore mes propres événements. */
  typing(id: string): Observable<boolean> {
    return this.resolveConversation(id).pipe(switchMap(conv => {
      if (!conv?.uuid) return EMPTY;
      const meId = this.session.user()?.id;
      return this.stomp.watch(`/topic/conversations/${conv.uuid}/typing`).pipe(
        map(frame => JSON.parse(frame.body) as { userId: string; typing: boolean }),
        filter(e => e.userId !== meId),
        map(e => e.typing),
      );
    }));
  }

  markRead(id: string): void {
    // Efface le badge « non lu » localement à l'ouverture de la conversation.
    const conv = this.cache().get(id);
    if (conv && conv.unread > 0) {
      this.cache.update(m => {
        const next = new Map(m);
        next.set(id, { ...conv, unread: 0 });
        return next;
      });
    }
  }

  /**
   * Accusé de lecture d'UN message (`PATCH /messages/{id}/read`). C'est cet appel
   * — jusqu'ici jamais émis — qui pose `readAt` côté serveur ; le serveur en informe
   * alors l'expéditeur en temps réel (son message passe « lu »). Appelé à la
   * réception d'un message du pair. Silencieux : un accusé raté n'alarme personne.
   */
  markMessageRead(messageId: string): void {
    if (!messageId) return;
    this.patch$<unknown>('messaging', `/messages/${messageId}/read`, {}, SILENT()).subscribe({ error: () => {} });
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
    photoUrl: peer?.photoUrl,
    msg: '',
    // Vrai compteur (repli sur l'ancien booléen si l'image backend ne l'envoie pas encore).
    unread: c.unreadCount ?? (c.isRead ? 0 : 1),
    time: '',
    uuid: c.id,
    peerUserId: peerId,
  };
}

/** `MessageResponse` → `ConversationMessage`. */
function toConversationMessage(msg: MessageResponse, meId: string | undefined, _byId: Map<string | undefined, unknown>): ConversationMessage {
  const mine = msg.senderUserId === meId;
  const files = messageFiles(msg);
  return {
    id: msg.id,
    me: mine,
    parts: parseRichText(msg.content),
    time: formatTime(msg.sentAt),
    read: mine ? !!msg.readAt : undefined,
    unreadByMe: !mine && !msg.readAt,
    files,
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
