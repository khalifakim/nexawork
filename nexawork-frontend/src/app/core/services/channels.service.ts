import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { delay } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { BaseHttpService } from '@core/http/base-http.service';
import { FilesHttpService, StoredFile } from '@core/http/files.http.service';
import { StompClientService } from '@core/ws/stomp-client.service';
import {
  Channel, ChannelFile, ChannelMessage, ChannelResponse, ChannelRestriction, CreateChannelPayload,
  MessagePageResponse, MessageResponse, UpdateChannelPayload,
} from '@core/models/channel.models';
import { CHANNELS_BY_WORKSPACE, CHANNEL_THREADS, DEFAULT_CHANNEL_THREAD } from '@core/mock/channels';
import { parseRichText } from '@core/util/mention.util';
import { avatarColorFor } from '@core/util/ui.util';
import { SessionService } from './session.service';
import { MembersService } from './members.service';

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
  abstract sendMessage(id: string, content: string, files?: File[]): Observable<void>;

  abstract rename(id: string, patch: UpdateChannelPayload): void;
  abstract remove(id: string): void;
  abstract create(payload: CreateChannelPayload): Channel;
  abstract restrictionOf(id: string): ChannelRestriction;
  abstract setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): void;
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

  list(): Observable<Channel[]> { return this.channels$; }
  thread(id: string): Observable<ChannelMessage[]> { return of(CHANNEL_THREADS[id] ?? DEFAULT_CHANNEL_THREAD).pipe(delay(80)); }
  live(_id: string): Observable<ChannelMessage> { return EMPTY; }
  sendMessage(_id: string, _content: string, _files?: File[]): Observable<void> { return of(void 0); }

  rename(id: string, patch: UpdateChannelPayload): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(m => ({ ...m, [wsId]: (m[wsId] ?? []).map(c => c.id === id ? { ...c, name: patch.name, kind: patch.kind } : c) }));
  }
  remove(id: string): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(m => ({ ...m, [wsId]: (m[wsId] ?? []).filter(c => c.id !== id) }));
    this.restrictions.update(r => { if (!(id in r)) return r; const { [id]: _, ...rest } = r; return rest; });
  }
  create(payload: CreateChannelPayload): Channel {
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
    return channel;
  }
  restrictionOf(id: string): ChannelRestriction { return this.restrictions()[id] ?? { mode: 'open', grants: [] }; }
  setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): void {
    this.restrictions.update(map => {
      if (r.mode === 'open') { if (!(id in map)) return map; const { [id]: _, ...rest } = map; return rest; }
      return { ...map, [id]: { mode: 'private', grants: r.grants.map(g => ({ ...g })) } };
    });
    if (readonly !== undefined) {
      const wsId = this.session.activeWorkspaceId();
      this.perWs.update(map => ({ ...map, [wsId]: (map[wsId] ?? []).map(c => c.id === id ? { ...c, readonly } : c) }));
    }
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
    const grants = this.restrictionOf(id).grants;
    const me = 'Akim Koné';
    return grants.some(g => g.type === 'user' && g.name === me);
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

  /** Snapshot des canaux visibles (par slug) — alimente les méthodes synchrones. */
  private readonly cache = signal<Map<string, Channel>>(new Map());

  list(): Observable<Channel[]> {
    return this.get$<ChannelResponse[]>('messaging', '/channels').pipe(
      map(rs => rs.map(toChannel)),
      map(list => { this.cache.set(new Map(list.map(c => [c.id, c]))); return list; }),
    );
  }

  private uuidOf(slug: string): string | undefined { return this.cache().get(slug)?.uuid; }

  thread(id: string): Observable<ChannelMessage[]> {
    return this.ensureUuid(id).pipe(switchMap(uuid => {
      if (!uuid) return of<ChannelMessage[]>([]);
      return forkJoin({
        page: this.get$<MessagePageResponse>('messaging', `/channels/${uuid}/messages`),
        dir: this.members.directory(),
      }).pipe(map(({ page, dir }) => {
        const meId = this.session.user()?.id;
        const byId = new Map(dir.map(m => [m.userId, m]));
        return page.messages.map(msg => toChannelMessage(msg, meId, byId));
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

  sendMessage(id: string, content: string, files: File[] = []): Observable<void> {
    const text = content.trim();
    return this.ensureUuid(id).pipe(switchMap(uuid => {
      if (!uuid) return of(void 0);
      const endpoint = `/channels/${uuid}/messages`;
      if (files.length === 0) {
        return text
          ? this.post$<MessageResponse>('messaging', endpoint, { content: text }).pipe(map(() => void 0))
          : of(void 0);
      }
      // Téléverse tous les fichiers puis envoie UN SEUL message qui les porte tous.
      const workspaceId = this.session.activeWorkspaceId();
      return forkJoin(files.map(f => this.filesSvc.upload('channel-msg', f, { workspaceId, channelId: uuid })))
        .pipe(switchMap(stored =>
          this.post$<MessageResponse>('messaging', endpoint, messageBody(text, stored)).pipe(map(() => void 0))));
    }));
  }

  rename(id: string, patch: UpdateChannelPayload): void {
    const uuid = this.uuidOf(id);
    if (!uuid) return;
    const icon = patch.kind === 'bell' ? 'BELL' : 'HASH';
    this.patch$<ChannelResponse>('messaging', `/channels/${uuid}`, { name: patch.name, icon }).subscribe();
  }
  remove(id: string): void {
    const uuid = this.uuidOf(id);
    if (uuid) this.delete$<void>('messaging', `/channels/${uuid}`).subscribe();
  }
  create(payload: CreateChannelPayload): Channel {
    // Optimiste : renvoie une entrée locale ; l'appel réel rafraîchit la liste.
    const slug = slugifyChannel(payload.name) || 'canal';
    const channel: Channel = { id: slug, name: payload.name, scope: payload.scope, kind: payload.kind, project: payload.project, readonly: payload.readonly };
    this.post$<ChannelResponse>('messaging', '/channels', {
      name: payload.name,
      icon: payload.kind === 'bell' ? 'BELL' : 'HASH',
      readonly: payload.readonly,
      isPrivate: payload.restriction.mode === 'private',
      memberUserIds: [],
    }).subscribe();
    return channel;
  }
  restrictionOf(id: string): ChannelRestriction {
    return { mode: this.cache().get(id)?.isPrivate ? 'private' : 'open', grants: [] };
  }
  setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): void {
    const uuid = this.uuidOf(id);
    if (!uuid) return;
    this.put$<void>('messaging', `/channels/${uuid}/access`, { isPrivate: r.mode === 'private', memberUserIds: [] }).subscribe();
    if (readonly !== undefined) {
      const c = this.cache().get(id);
      this.patch$<ChannelResponse>('messaging', `/channels/${uuid}`, { readonly, icon: c?.kind === 'bell' ? 'BELL' : 'HASH', name: c?.name }).subscribe();
    }
  }
  isPrivate(id: string): boolean { return !!this.cache().get(id)?.isPrivate; }
  isReadonly(id: string): boolean {
    const c = this.cache().get(id);
    return c?.readonly ?? c?.kind === 'bell';
  }
  /** La liste backend ne renvoie que les canaux accessibles (REF F). */
  hasAccess(id: string): boolean { return this.cache().has(id); }
  canWriteInReadonly(id: string, _isProjectLead: boolean): boolean {
    // `canWrite` est déjà calculé côté serveur (REF D) et porté par la liste.
    return this.cache().get(id)?.canWrite ?? false;
  }

  /** Résout le slug en UUID ; recharge la liste si le cache est froid (deep-link). */
  private ensureUuid(slug: string): Observable<string | undefined> {
    const known = this.uuidOf(slug);
    if (known) return of(known);
    return this.list().pipe(map(() => this.uuidOf(slug)));
  }
}

/** Corps d'un message envoyé (contenu + pièces jointes multiples). */
export interface OutgoingMessageBody { content: string; attachments: { url: string; name: string }[]; }

/**
 * Corps d'un message portant N fichiers déjà téléversés : un seul message avec
 * la liste de ses pièces jointes (le backend accepte 0..N par message depuis V2).
 * Réutilisé par canaux et conversations.
 */
export function messageBody(text: string, stored: StoredFile[]): OutgoingMessageBody {
  return { content: text, attachments: stored.map(s => ({ url: s.downloadUrl, name: s.fileName })) };
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
  return {
    id: slugifyChannel(r.name),
    name: r.name,
    scope: r.channelType === 'PROJECT' ? 'project' : 'org',
    kind: r.icon === 'BELL' ? 'bell' : 'hash',
    readonly: r.readonly,
    uuid: r.id,
    isPrivate: r.isPrivate,
    canWrite: r.canWrite,
    projectId: r.projectId,
  };
}

/** `MessageResponse` → `ChannelMessage` (author résolu depuis l'annuaire). */
function toChannelMessage(msg: MessageResponse, meId: string | undefined, byId: Map<string | undefined, { name: string }>): ChannelMessage {
  const author = byId.get(msg.senderUserId)?.name ?? 'Membre';
  const files = messageFiles(msg);
  return {
    author,
    color: avatarColorFor(msg.senderUserId),
    time: formatTime(msg.sentAt),
    parts: parseRichText(msg.content),
    mine: msg.senderUserId === meId,
    files,
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
