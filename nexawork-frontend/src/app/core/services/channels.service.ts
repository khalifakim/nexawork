import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { delay, filter } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { BaseHttpService } from '@core/http/base-http.service';
import { SILENT } from '@core/http/http-context';
import { FilesHttpService, StoredFile } from '@core/http/files.http.service';
import { StompClientService } from '@core/ws/stomp-client.service';
import {
  Channel, ChannelAccessMode, ChannelFile, ChannelGrant, ChannelMemberResponse, ChannelMessage,
  ChannelResponse, ChannelRestriction, CreateChannelPayload, MessagePageResponse, MessageResponse,
  UpdateChannelPayload,
} from '@core/models/channel.models';
import { CHANNELS_BY_WORKSPACE, CHANNEL_THREADS, DEFAULT_CHANNEL_THREAD } from '@core/mock/channels';
import { parseRichText } from '@core/util/mention.util';
import { MentionRef } from '@core/models/mention.models';
import { avatarColorFor } from '@core/util/ui.util';
import { SessionService } from './session.service';
import { MembersService } from './members.service';
import { ProjectsService } from './projects.service';
import { DataRefreshService } from './data-refresh.service';

/**
 * Channel data (workspace-scoped). Swap `ChannelsMockService` for
 * `ChannelsHttpService` via `environment.mock.channels`.
 *
 * The service is the single source of truth for the mutable channel state that
 * lives in the sidebar: renames, deletions, custom-created channels, per-channel
 * restrictions (public / private) and read-only overrides.
 */
export abstract class ChannelsService {
  /** Channels of the active workspace (sidebar, grouped by scope). */
  abstract list(): Observable<Channel[]>;
  /** Message thread of one channel (history). */
  abstract thread(id: string): Observable<ChannelMessage[]>;
  /** Live stream of new messages of one channel (STOMP). */
  abstract live(id: string): Observable<ChannelMessage>;
  /**
   * Send a message to a channel, with optional file attachments. Chaque fichier
   * est d'abord téléversé au File Service, puis rattaché à un message (le
   * backend porte une pièce jointe par message).
   */
  abstract sendMessage(id: string, content: string, files?: File[], mentions?: MentionRef[], replyToMessageId?: string): Observable<MessageResponse | null>;

  /** Supprime un message (soft delete) — auteur dans la fenêtre, ou admin. */
  abstract deleteMessage(messageId: string): Observable<void>;
  /** Modifie le contenu d'un message (auteur, fenêtre de temps). */
  abstract editMessage(messageId: string, content: string): Observable<MessageResponse>;
  /** Ajoute/retire (toggle) une réaction emoji sur un message. */
  abstract toggleReaction(messageId: string, emoji: string): Observable<MessageResponse>;

  /** Signale la saisie dans un canal (STOMP, volatile) — alimente vue canal + sidebar. */
  abstract sendTyping(id: string, typing: boolean): void;
  /** Flux « quelqu'un écrit dans ce canal » (true/false), hors soi-même. */
  abstract typing(id: string): Observable<boolean>;
  /** Marque le canal comme lu par l'appelant (vide le badge « non lus », §6). */
  abstract markRead(id: string): void;
  /**
   * Vue réactive des canaux. Comme pour les conversations, la sidebar la lit pour
   * que le badge « non lus » se vide à l'ouverture **sans rechargement**.
   */
  abstract readonly items: Signal<Channel[]>;

  abstract rename(id: string, patch: UpdateChannelPayload): void;
  abstract remove(id: string): void;
  /**
   * Crée le canal et ne le résout qu'une fois **persisté** : l'appelant ne peut
   * naviguer vers le canal (et donc franchir `channelAccessGuard`) qu'après que
   * le backend le connaît.
   */
  abstract create(payload: CreateChannelPayload): Observable<Channel>;
  abstract restrictionOf(id: string): ChannelRestriction;
  /**
   * Accès **réels** du canal : mode + bénéficiaires explicites, relus du serveur
   * (`GET /channels/{id}/access`). `restrictionOf` ne connaît que le mode — le
   * modal « Gérer les accès » doit, lui, afficher les vrais bénéficiaires.
   */
  abstract access(id: string): Observable<ChannelRestriction>;
  /**
   * Persiste les accès. Les bénéficiaires partent réellement au backend : une
   * équipe est **déployée en ses membres** (le Messaging ne connaît pas la
   * composition des projets — il ne stocke que des `userId`).
   */
  abstract setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): Observable<void>;
  abstract isPrivate(id: string): boolean;
  abstract isReadonly(id: string): boolean;
  /**
   * True when the current user has access to a private channel — always true
   * for public channels. REF F: private channels must not appear at all for
   * users without an explicit grant.
   */
  abstract hasAccess(id: string): boolean;
  /**
   * True when the current user is allowed to WRITE in a readonly channel.
   * REF D: org readonly channels → ADMIN/OWNER only ; project readonly channels
   * → ADMIN/OWNER/chef de projet.
   */
  abstract canWriteInReadonly(id: string, isProjectLead: boolean): boolean;
}

/** Slugify a channel display name for use as its id/URL segment. */
export function slugifyChannel(input: string): string {
  return input.trim().replace(/^#+/, '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class ChannelsMockService extends ChannelsService {
  private readonly session = inject(SessionService);

  private readonly perWs = signal<Record<string, Channel[]>>(
    Object.fromEntries(Object.entries(CHANNELS_BY_WORKSPACE).map(([k, v]) => [k, v.map(c => ({ ...c }))])),
  );
  private readonly restrictions = signal<Record<string, ChannelRestriction>>({});

  private readonly activeChannels: Signal<Channel[]> = computed(() => {
    const wsId = this.session.activeWorkspaceId();
    return this.perWs()[wsId] ?? [];
  });
  private readonly channels$ = toObservable(this.activeChannels);
  /** Vue réactive (mock) : la sidebar la lit ; `markRead` y vide le badge. */
  readonly items = this.activeChannels;

  list(): Observable<Channel[]> { return this.channels$; }
  thread(id: string): Observable<ChannelMessage[]> { return of(CHANNEL_THREADS[id] ?? DEFAULT_CHANNEL_THREAD).pipe(delay(80)); }
  live(_id: string): Observable<ChannelMessage> { return EMPTY; }
  sendMessage(_id: string, _content: string, _files?: File[], _mentions?: MentionRef[], _replyToMessageId?: string): Observable<MessageResponse | null> { return of(null); }
  deleteMessage(_messageId: string): Observable<void> { return of(void 0); }
  editMessage(_messageId: string, _content: string): Observable<MessageResponse> { return EMPTY; }
  toggleReaction(_messageId: string, _emoji: string): Observable<MessageResponse> { return EMPTY; }
  sendTyping(_id: string, _typing: boolean): void { /* no-op en mock */ }
  typing(_id: string): Observable<boolean> { return EMPTY; }
  markRead(id: string): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(m => ({ ...m, [wsId]: (m[wsId] ?? []).map(c => c.id === id ? { ...c, unread: 0 } : c) }));
  }

  rename(id: string, patch: UpdateChannelPayload): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(m => ({ ...m, [wsId]: (m[wsId] ?? []).map(c => c.id === id ? { ...c, name: patch.name, kind: patch.kind } : c) }));
  }
  remove(id: string): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(m => ({ ...m, [wsId]: (m[wsId] ?? []).filter(c => c.id !== id) }));
    this.restrictions.update(r => { if (!(id in r)) return r; const { [id]: _, ...rest } = r; return rest; });
  }
  create(payload: CreateChannelPayload): Observable<Channel> {
    const wsId = this.session.activeWorkspaceId();
    const existing = this.perWs()[wsId] ?? [];
    const base = slugifyChannel(payload.name) || 'canal';
    let id = base, i = 2;
    while (existing.some(c => c.id === id)) { id = `${base}-${i++}`; }
    const channel: Channel = { id, name: id, scope: payload.scope, kind: payload.kind, project: payload.project, readonly: payload.readonly };
    this.perWs.update(m => ({ ...m, [wsId]: [...(m[wsId] ?? []), channel] }));
    if (payload.restriction.mode === 'private') {
      this.restrictions.update(r => ({ ...r, [id]: { mode: 'private', grants: payload.restriction.grants.map(g => ({ ...g })) } }));
    }
    return of(channel).pipe(delay(80));
  }
  restrictionOf(id: string): ChannelRestriction { return this.restrictions()[id] ?? { mode: 'open', grants: [] }; }
  access(id: string): Observable<ChannelRestriction> { return of(this.restrictionOf(id)).pipe(delay(40)); }
  setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): Observable<void> {
    this.restrictions.update(map => {
      if (r.mode === 'open') { if (!(id in map)) return map; const { [id]: _, ...rest } = map; return rest; }
      return { ...map, [id]: { mode: 'private', grants: r.grants.map(g => ({ ...g })) } };
    });
    if (readonly !== undefined) {
      const wsId = this.session.activeWorkspaceId();
      this.perWs.update(map => ({ ...map, [wsId]: (map[wsId] ?? []).map(c => c.id === id ? { ...c, readonly } : c) }));
    }
    return of(void 0).pipe(delay(40));
  }
  isPrivate(id: string): boolean { return this.restrictionOf(id).mode === 'private'; }
  isReadonly(id: string): boolean {
    const wsId = this.session.activeWorkspaceId();
    const c = (this.perWs()[wsId] ?? []).find(x => x.id === id);
    if (c?.readonly !== undefined) return c.readonly;
    return c?.kind === 'bell';
  }
  hasAccess(id: string): boolean {
    if (!this.isPrivate(id)) return true;
    if (this.session.isAdmin()) return true;
    const meId = this.session.user()?.id;
    return this.restrictionOf(id).grants.some(g => g.type === 'user' && g.id === meId);
  }
  canWriteInReadonly(id: string, isProjectLead: boolean): boolean {
    const isAdmin = this.session.isAdmin();
    const wsId = this.session.activeWorkspaceId();
    const c = (this.perWs()[wsId] ?? []).find(x => x.id === id);
    if (!c) return isAdmin;
    if (!this.isReadonly(id)) return true;
    if (c.scope === 'org') return isAdmin;
    return isAdmin || isProjectLead;
  }
}

@Injectable()
export class ChannelsHttpService extends BaseHttpService implements ChannelsService {
  private readonly session = inject(SessionService);
  private readonly members = inject(MembersService);
  private readonly stomp = inject(StompClientService);
  private readonly filesSvc = inject(FilesHttpService);
  private readonly refresh = inject(DataRefreshService);
  private readonly projects = inject(ProjectsService);

  /**
   * Snapshot des canaux visibles — alimente les méthodes synchrones.
   *
   * Indexé par **id unique** (`general-184da140`), avec un **repli par slug** : les
   * liens des notifications ne portent que le nom du canal (`/app/canaux/general`),
   * et doivent continuer d'aboutir.
   */
  private readonly cache = signal<Map<string, Channel>>(new Map());
  /** Liste dédupliquée (le cache indexe id ET slug → il ne peut servir de vue). */
  private readonly _list = signal<Channel[]>([]);
  /** Vue réactive : `markRead` vide le badge sans rechargement (parité conversations). */
  readonly items = this._list.asReadonly();

  list(): Observable<Channel[]> {
    return this.get$<ChannelResponse[]>('messaging', '/channels').pipe(
      map(rs => rs.map(toChannel)),
      map(list => {
        const byId = new Map<string, Channel>();
        // ⚠️ L'id d'abord, le slug ENSUITE et sans écraser : un canal d'organisation
        // nommé « général » doit rester prioritaire sur `general`, et le premier
        // canal de projet homonyme sert de repli.
        for (const c of list) byId.set(c.id, c);
        for (const c of list) if (c.slug && !byId.has(c.slug)) byId.set(c.slug, c);
        this.cache.set(byId);
        this._list.set(list);
        return list;
      }),
    );
  }

  /**
   * Marque le canal lu (`PATCH /channels/{uuid}/read`) et vide le badge localement
   * (le serveur est la source de vérité au prochain `list()`). Silencieux.
   */
  markRead(id: string): void {
    const uuid = this.uuidOf(id);
    // On avance aussi `lastReadAt` localement : sinon, à la réouverture du canal
    // dans la même session (liste non rechargée), le séparateur « Messages non
    // lus » serait recalculé sur l'ancienne date et réapparaîtrait à tort.
    const now = new Date().toISOString();
    this._list.update(l => l.map(c => (c.id === id || (uuid && c.uuid === uuid)) ? { ...c, unread: 0, lastReadAt: now } : c));
    if (uuid) this.patch$<unknown>('messaging', `/channels/${uuid}/read`, {}, SILENT()).subscribe({ error: () => {} });
  }

  /** Résout un id d'URL (id unique **ou** slug hérité) en canal connu. */
  private resolve(id: string): Channel | undefined { return this.cache().get(id); }

  private uuidOf(id: string): string | undefined { return this.resolve(id)?.uuid; }

  /** Publie l'indicateur de saisie du canal (`/app/channels/{uuid}/typing`). Volatile. */
  sendTyping(id: string, typing: boolean): void {
    const uuid = this.uuidOf(id);
    if (uuid) this.stomp.publish(`/app/channels/${uuid}/typing`, { typing });
  }

  /** Flux « quelqu'un écrit dans ce canal » : ignore mes propres événements. */
  typing(id: string): Observable<boolean> {
    return this.ensureUuid(id).pipe(switchMap(uuid => {
      if (!uuid) return EMPTY;
      const meId = this.session.user()?.id;
      return this.stomp.watch(`/topic/channels/${uuid}/typing`).pipe(
        map(frame => JSON.parse(frame.body) as { userId: string; typing: boolean }),
        filter(e => e.userId !== meId),
        map(e => e.typing),
      );
    }));
  }

  thread(id: string): Observable<ChannelMessage[]> {
    return this.ensureUuid(id).pipe(switchMap(uuid => {
      if (!uuid) return of<ChannelMessage[]>([]);
      return forkJoin({
        page: this.get$<MessagePageResponse>('messaging', `/channels/${uuid}/messages`),
        dir: this.members.directory(),
      }).pipe(map(({ page, dir }) => {
        const meId = this.session.user()?.id;
        const byId = new Map(dir.map(m => [m.userId, m]));
        // Le backend pagine du plus récent au plus ancien (curseur) : on ré-inverse
        // pour l'affichage chronologique (anciens en haut, nouveaux en bas).
        return page.messages.map(msg => toChannelMessage(msg, meId, byId)).reverse();
      }));
    }));
  }

  live(id: string): Observable<ChannelMessage> {
    return this.ensureUuid(id).pipe(switchMap(uuid => {
      if (!uuid) return EMPTY;
      const meId = this.session.user()?.id;
      return forkJoin({ dir: this.members.directory() }).pipe(switchMap(({ dir }) => {
        const byId = new Map(dir.map(m => [m.userId, m]));
        return this.stomp.watch(`/topic/channels/${uuid}`).pipe(
          map(frame => toChannelMessage(JSON.parse(frame.body) as MessageResponse, meId, byId)),
        );
      }));
    }));
  }

  sendMessage(id: string, content: string, files: File[] = [], mentions: MentionRef[] = [], replyToMessageId?: string): Observable<MessageResponse | null> {
    const text = content.trim();
    const reply = replyToMessageId ? { replyToMessageId } : {};
    return this.ensureUuid(id).pipe(switchMap(uuid => {
      if (!uuid) return of(null);
      const endpoint = `/channels/${uuid}/messages`;
      if (files.length === 0) {
        // Le DTO renvoyé porte l'id réel : l'appelant le pose sur son message
        // optimiste, sans quoi ce message ne serait ni modifiable ni supprimable
        // avant un rechargement (il n'aurait pas d'id).
        return text
          ? this.post$<MessageResponse>('messaging', endpoint, { content: text, mentions, ...reply })
          : of(null);
      }
      // Téléverse tous les fichiers puis envoie UN SEUL message qui les porte tous.
      const workspaceId = this.session.activeWorkspaceId();
      return forkJoin(files.map(f => this.filesSvc.upload('channel-msg', f, { workspaceId, channelId: uuid })))
        .pipe(switchMap(stored =>
          this.post$<MessageResponse>('messaging', endpoint, { ...messageBody(text, stored, mentions), ...reply })));
    }));
  }

  /** Suppression (soft delete) — ciblée par l'id du message, indépendante du canal. */
  deleteMessage(messageId: string): Observable<void> {
    return this.delete$<void>('messaging', `/messages/${messageId}`);
  }

  /** Édition du contenu — renvoie le message modifié (edited = true). */
  editMessage(messageId: string, content: string): Observable<MessageResponse> {
    return this.patch$<MessageResponse>('messaging', `/messages/${messageId}`, { content });
  }

  /** Toggle d'une réaction emoji — renvoie le message avec ses réactions à jour. */
  toggleReaction(messageId: string, emoji: string): Observable<MessageResponse> {
    return this.post$<MessageResponse>('messaging', `/messages/${messageId}/reactions`, { emoji });
  }

  rename(id: string, patch: UpdateChannelPayload): void {
    const uuid = this.uuidOf(id);
    if (!uuid) return;
    const icon = patch.kind === 'bell' ? 'BELL' : 'HASH';
    this.patch$<ChannelResponse>('messaging', `/channels/${uuid}`, { name: patch.name, icon })
      .pipe(this.refresh.mutating('channels'))
      .subscribe();
  }
  remove(id: string): void {
    const uuid = this.uuidOf(id);
    if (uuid) {
      this.delete$<void>('messaging', `/channels/${uuid}`)
        .pipe(this.refresh.mutating('channels'))
        .subscribe();
    }
  }
  create(payload: CreateChannelPayload): Observable<Channel> {
    const isPrivate = payload.restriction.mode === 'private';
    return this.memberUserIds(payload.restriction.grants, payload.projectId).pipe(
      switchMap(memberUserIds => this.post$<ChannelResponse>('messaging', '/channels', {
        name: payload.name,
        icon: payload.kind === 'bell' ? 'BELL' : 'HASH',
        projectId: payload.projectId,
        readonly: payload.readonly,
        isPrivate,
        memberUserIds: isPrivate ? memberUserIds : [],
      })),
    ).pipe(
      this.refresh.mutating('channels'), // loader + refetch sidebar
      map(toChannel),
      // Le canal est immédiatement connu du cache : la navigation qui suit passe
      // `channelAccessGuard` sans dépendre du refetch de la sidebar. On indexe
      // aussi son slug (sans écraser un homonyme déjà connu).
      map(channel => {
        this.cache.update(m => {
          const next = new Map(m).set(channel.id, channel);
          if (channel.slug && !next.has(channel.slug)) next.set(channel.slug, channel);
          return next;
        });
        return channel;
      }),
    );
  }
  restrictionOf(id: string): ChannelRestriction {
    return { mode: this.resolve(id)?.isPrivate ? 'private' : 'open', grants: [] };
  }

  /** Bénéficiaires réels du canal, noms résolus via l'annuaire. */
  access(id: string): Observable<ChannelRestriction> {
    const channel = this.resolve(id);
    const uuid = channel?.uuid;
    const mode: ChannelAccessMode = channel?.isPrivate ? 'private' : 'open';
    if (!uuid || mode === 'open') return of({ mode, grants: [] });
    return forkJoin({
      members: this.get$<ChannelMemberResponse[]>('messaging', `/channels/${uuid}/access`),
      dir: this.members.directory(),
    }).pipe(map(({ members, dir }) => {
      const byId = new Map(dir.map(m => [m.userId, m]));
      return {
        mode,
        // Le backend ne stocke que des utilisateurs : une équipe conviée a été
        // déployée en ses membres à l'enregistrement, on les relit tels quels.
        grants: members.map(m => ({
          type: 'user' as const,
          id: m.userId,
          name: byId.get(m.userId)?.name ?? 'Membre',
        })),
      };
    }));
  }

  setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): Observable<void> {
    const channel = this.resolve(id);
    const uuid = channel?.uuid;
    if (!uuid) return of(void 0);
    const isPrivate = r.mode === 'private';

    const calls: Observable<unknown>[] = [
      this.memberUserIds(r.grants, channel?.projectId).pipe(switchMap(memberUserIds =>
        this.put$<void>('messaging', `/channels/${uuid}/access`,
          { isPrivate, memberUserIds: isPrivate ? memberUserIds : [] }))),
    ];
    if (readonly !== undefined) {
      calls.push(this.patch$<ChannelResponse>('messaging', `/channels/${uuid}`,
        { readonly, icon: channel?.kind === 'bell' ? 'BELL' : 'HASH', name: channel?.name }));
    }
    return forkJoin(calls).pipe(this.refresh.mutating('channels'), map(() => void 0));
  }

  /**
   * Grants → `userId[]` envoyés au backend. Une équipe est **déployée en ses
   * membres** : le Messaging ne connaît pas la composition des projets, il ne
   * sait stocker que des utilisateurs (`channel_members.user_id`).
   */
  private memberUserIds(grants: ChannelGrant[], projectId?: string): Observable<string[]> {
    const users = grants.filter(g => g.type === 'user').map(g => g.id);
    const teams = grants.filter(g => g.type === 'team').map(g => g.id);
    if (teams.length === 0 || !projectId) return of([...new Set(users)]);
    return this.projects.members(projectId).pipe(map(ms => [...new Set([
      ...users,
      ...ms.filter(m => m.teamId && teams.includes(m.teamId)).map(m => m.userId),
    ])]));
  }
  isPrivate(id: string): boolean { return !!this.resolve(id)?.isPrivate; }
  isReadonly(id: string): boolean {
    const c = this.resolve(id);
    return c?.readonly ?? c?.kind === 'bell';
  }
  /** La liste backend ne renvoie que les canaux accessibles (REF F). */
  hasAccess(id: string): boolean { return !!this.resolve(id); }
  canWriteInReadonly(id: string, _isProjectLead: boolean): boolean {
    // `canWrite` est déjà calculé côté serveur (REF D) et porté par la liste.
    return this.resolve(id)?.canWrite ?? false;
  }

  /** Résout le slug en UUID ; recharge la liste si le cache est froid (deep-link). */
  private ensureUuid(slug: string): Observable<string | undefined> {
    const known = this.uuidOf(slug);
    if (known) return of(known);
    return this.list().pipe(map(() => this.uuidOf(slug)));
  }
}

/** Corps d'un message envoyé (contenu + pièces jointes multiples). */
export interface OutgoingMessageBody {
  content: string;
  attachments: { url: string; name: string }[];
  /** Cibles des mentions — sans elles le backend ne peut rattacher la mention à personne. */
  mentions: MentionRef[];
}

/**
 * Corps d'un message portant N fichiers déjà téléversés : un seul message avec
 * la liste de ses pièces jointes (le backend accepte 0..N par message depuis V2).
 * Réutilisé par canaux et conversations.
 */
export function messageBody(text: string, stored: StoredFile[], mentions: MentionRef[] = []): OutgoingMessageBody {
  return { content: text, attachments: stored.map(s => ({ url: s.downloadUrl, name: s.fileName })), mentions };
}

/**
 * Pièces jointes d'un message → vue d'affichage (liste V2, repli sur la forme
 * mono-pièce héritée). L'URL permet le téléchargement réel. Partagé canaux/convos.
 */
export function messageFiles(msg: MessageResponse): ChannelFile[] | undefined {
  if (msg.attachments?.length) {
    return msg.attachments.map((a, i) => ({ id: i + 1, name: a.fileName ?? 'fichier', size: 0, url: a.fileUrl }));
  }
  if (msg.attachmentUrl) {
    return [{ id: 1, name: msg.attachmentName ?? 'fichier', size: 0, url: msg.attachmentUrl }];
  }
  return undefined;
}

/** `ChannelResponse` (backend) → `Channel` (view-model, id = slug). */
function toChannel(r: ChannelResponse): Channel {
  const slug = slugifyChannel(r.name);
  return {
    // Un canal de PROJET est suffixé par son projet : deux projets ont chacun leur
    // `#général`, et un id commun les faisait se recouvrir (cache écrasé, clés
    // dupliquées dans la sidebar, canal inaccessible).
    id: r.projectId ? `${slug}-${r.projectId.slice(0, 8)}` : slug,
    slug,
    name: r.name,
    scope: r.channelType === 'PROJECT' ? 'project' : 'org',
    kind: r.icon === 'BELL' ? 'bell' : 'hash',
    readonly: r.readonly,
    uuid: r.id,
    isPrivate: r.isPrivate,
    canWrite: r.canWrite,
    projectId: r.projectId,
    memberCount: r.memberCount,
    lastActivityAt: r.lastActivityAt,
    unread: r.unreadCount ?? 0,
    lastReadAt: r.lastReadAt,
  };
}

/** `MessageResponse` → `ChannelMessage` (author résolu depuis l'annuaire). */
function toChannelMessage(
  msg: MessageResponse,
  meId: string | undefined,
  byId: Map<string | undefined, { name: string; photoUrl?: string }>,
): ChannelMessage {
  const sender = byId.get(msg.senderUserId);
  const files = messageFiles(msg);
  return {
    id: msg.id,
    sentAt: msg.sentAt,
    author: sender?.name ?? 'Membre',
    // L'annuaire porte la photo : la reprendre ici la rend disponible partout où
    // un message est affiché (canaux ET conversations).
    authorPhotoUrl: sender?.photoUrl,
    color: avatarColorFor(msg.senderUserId),
    time: formatTime(msg.sentAt),
    parts: parseRichText(msg.content),
    mine: msg.senderUserId === meId,
    files,
    edited: !!msg.edited,
    isDeleted: !!msg.isDeleted,
    replyTo: mapReply(msg.replyTo, byId),
    reactions: mapReactions(msg.reactions, meId),
  };
}

/** Aperçu du message cité, avec l'auteur résolu depuis l'annuaire. */
export function mapReply(
  r: import('@core/models/channel.models').ReplyPreviewResponse | undefined,
  byId: Map<string | undefined, { name: string }>,
): import('@core/models/channel.models').MessageReply | undefined {
  if (!r) return undefined;
  return {
    id: r.id,
    author: byId.get(r.authorUserId)?.name ?? 'Membre',
    excerpt: r.deleted ? 'Message supprimé' : (r.excerpt ?? ''),
    deleted: r.deleted,
  };
}

/** Réactions prêtes à afficher : total + « ai-je réagi » dérivés de `userIds`. */
export function mapReactions(
  list: import('@core/models/channel.models').ReactionSummaryResponse[] | undefined,
  meId: string | undefined,
): import('@core/models/channel.models').MessageReaction[] | undefined {
  if (!list?.length) return undefined;
  return list.map(r => ({ emoji: r.emoji, count: r.userIds.length, mine: !!meId && r.userIds.includes(meId) }));
}

function formatTime(iso: string): string {
  // Garde défensive : `new Date(null/undefined/'')` donnerait l'epoch → « 00:00 »
  // affiché à tort. La cause racine (sentAt nul en temps réel) est corrigée côté
  // backend (saveAndFlush), mais un temps absent ne doit jamais afficher minuit.
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
