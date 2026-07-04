import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Channel,
  ChannelMessage,
  ChannelRestriction,
  CreateChannelPayload,
  UpdateChannelPayload,
} from '@core/models/channel.models';
import { CHANNELS_BY_WORKSPACE, CHANNEL_THREADS, DEFAULT_CHANNEL_THREAD } from '@core/mock/channels';
import { SessionService } from './session.service';

/**
 * Channel data (workspace-scoped). Swap `ChannelsMockService` for an HTTP impl
 * when the backend is connected — components depend only on this abstract class.
 *
 * The service is the single source of truth for the mutable channel state that
 * lives in the sidebar: renames, deletions, custom-created channels, per-channel
 * restrictions (public / private) and read-only overrides.
 */
export abstract class ChannelsService {
  /** Channels of the active workspace (sidebar, grouped by scope). */
  abstract list(): Observable<Channel[]>;
  /** Message thread of one channel. */
  abstract thread(id: string): Observable<ChannelMessage[]>;

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
function slugify(input: string): string {
  return input.trim().replace(/^#+/, '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class ChannelsMockService extends ChannelsService {
  private readonly session = inject(SessionService);

  /** Per-workspace channel state, seeded from the fixtures on first access. */
  private readonly perWs = signal<Record<string, Channel[]>>(
    Object.fromEntries(Object.entries(CHANNELS_BY_WORKSPACE).map(([k, v]) => [k, v.map(c => ({ ...c }))])),
  );
  private readonly restrictions = signal<Record<string, ChannelRestriction>>({});

  /** Channels of the currently active workspace as a reactive signal. */
  private readonly activeChannels: Signal<Channel[]> = computed(() => {
    const wsId = this.session.activeWorkspaceId();
    return this.perWs()[wsId] ?? [];
  });

  /**
   * Cached observable of the active workspace's channels. Created eagerly in an
   * injection context so it can be handed back from `list()` (which is called
   * inside a `switchMap`, i.e. outside any injection context).
   */
  private readonly channels$ = toObservable(this.activeChannels);

  list(): Observable<Channel[]> {
    return this.channels$;
  }

  thread(id: string): Observable<ChannelMessage[]> {
    return of(CHANNEL_THREADS[id] ?? DEFAULT_CHANNEL_THREAD).pipe(delay(80));
  }

  rename(id: string, patch: UpdateChannelPayload): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(map => ({
      ...map,
      [wsId]: (map[wsId] ?? []).map(c => c.id === id ? { ...c, name: patch.name, kind: patch.kind } : c),
    }));
  }

  remove(id: string): void {
    const wsId = this.session.activeWorkspaceId();
    this.perWs.update(map => ({
      ...map,
      [wsId]: (map[wsId] ?? []).filter(c => c.id !== id),
    }));
    this.restrictions.update(r => {
      if (!(id in r)) return r;
      const { [id]: _, ...rest } = r;
      return rest;
    });
  }

  create(payload: CreateChannelPayload): Channel {
    const wsId = this.session.activeWorkspaceId();
    const existing = this.perWs()[wsId] ?? [];
    let base = slugify(payload.name) || 'canal';
    let id = base;
    let i = 2;
    while (existing.some(c => c.id === id)) { id = `${base}-${i++}`; }
    const channel: Channel = {
      id,
      name: id,
      scope: payload.scope,
      kind: payload.kind,
      project: payload.project,
      readonly: payload.readonly,
    };
    this.perWs.update(map => ({ ...map, [wsId]: [...(map[wsId] ?? []), channel] }));
    if (payload.restriction.mode === 'private') {
      this.restrictions.update(r => ({ ...r, [id]: { mode: 'private', grants: payload.restriction.grants.map(g => ({ ...g })) } }));
    }
    return channel;
  }

  restrictionOf(id: string): ChannelRestriction {
    return this.restrictions()[id] ?? { mode: 'open', grants: [] };
  }

  setRestriction(id: string, r: ChannelRestriction, readonly?: boolean): void {
    this.restrictions.update(map => {
      if (r.mode === 'open') {
        if (!(id in map)) return map;
        const { [id]: _, ...rest } = map;
        return rest;
      }
      return { ...map, [id]: { mode: 'private', grants: r.grants.map(g => ({ ...g })) } };
    });
    if (readonly !== undefined) {
      const wsId = this.session.activeWorkspaceId();
      this.perWs.update(map => ({
        ...map,
        [wsId]: (map[wsId] ?? []).map(c => c.id === id ? { ...c, readonly } : c),
      }));
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
    // Public channels are always accessible.
    if (!this.isPrivate(id)) return true;
    // ADMIN/OWNER of the workspace can see all channels (admin override).
    if (this.session.isAdmin()) return true;
    // Otherwise the user must be listed in the grants.
    // In this mock we haven't wired real user grant identity, so we default to
    // grant-based access: a private channel with an empty grant list is only
    // visible to admins (already handled above).
    const grants = this.restrictionOf(id).grants;
    // Frontend-first placeholder: the demo user "Akim Koné" is admin, other
    // identities are simulated via grant name matching.
    const me = 'Akim Koné';
    return grants.some(g => g.type === 'user' && g.name === me);
  }

  canWriteInReadonly(id: string, isProjectLead: boolean): boolean {
    const isAdmin = this.session.isAdmin();
    const wsId = this.session.activeWorkspaceId();
    const c = (this.perWs()[wsId] ?? []).find(x => x.id === id);
    if (!c) return isAdmin;
    // Non-readonly channels: everyone writes.
    if (!this.isReadonly(id)) return true;
    // Readonly org channels → admin/owner only.
    if (c.scope === 'org') return isAdmin;
    // Readonly project channels → admin/owner or chef de projet.
    return isAdmin || isProjectLead;
  }
}
