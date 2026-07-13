import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { filter, map, startWith, switchMap } from 'rxjs/operators';
import {
  ProjectChannelRef,
  ProjectDocRef,
  ProjectMemberRef,
  ProjectTaskRef,
} from '@core/models/mention.models';
import { MembersService } from './members.service';
import { ProjectsService } from './projects.service';
import { TasksService } from './tasks.service';
import { GedService } from './ged.service';
import { ChannelsService } from './channels.service';
import { Member } from '@core/models/member.models';
import { Channel } from '@core/models/channel.models';
import { GedItem } from '@core/models/ged.models';
import { TaskCard } from '@core/models/task.models';
import { avatarColorFor } from '@core/util/ui.util';

/** Contexte de mention déduit de l'URL. */
type MentionContext =
  | { kind: 'project'; id: string }
  | { kind: 'channel'; slug: string }
  | { kind: 'workspace' };

/**
 * Catalogue des mentions consommé par le composeur de commentaires/messages.
 * Les données sont **réelles** et **contextuelles** :
 *
 * - Contexte **projet** (commentaire de tâche, ou canal d'un projet) → seuls les
 *   personnes / tâches / documents / canaux **de ce projet**.
 * - Contexte **workspace** (canal d'organisation, conversation directe) → tout le
 *   workspace, **tous projets confondus**.
 *
 * Le contexte est déduit de l'URL ; pour un canal, on résout le canal pour savoir
 * s'il appartient à un projet (scope projet) ou à l'organisation (scope workspace).
 * `scope = projectId` cible un projet, `scope = null` = workspace entier.
 */
@Injectable({ providedIn: 'root' })
export class ProjectCatalogService {
  private readonly router = inject(Router);
  private readonly membersSvc = inject(MembersService);
  private readonly projectsSvc = inject(ProjectsService);
  private readonly tasksSvc = inject(TasksService);
  private readonly gedSvc = inject(GedService);
  private readonly channelsSvc = inject(ChannelsService);

  /** Contexte brut lu dans l'URL, recalculé à chaque navigation. */
  private readonly ctx = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.parseContext(this.router.url)),
      startWith(this.parseContext(this.router.url)),
    ),
    { initialValue: this.parseContext(this.router.url) },
  );

  /**
   * Périmètre effectif : `projectId` (string) pour un contexte projet, `null` pour
   * un contexte workspace (tout). Résout le canal courant si besoin (async).
   */
  private readonly scope = toSignal(
    toObservable(this.ctx).pipe(switchMap(ctx => this.resolveScope(ctx))),
    { initialValue: null as string | null },
  );

  readonly currentProjectId = computed(() => this.scope());

  // ── Sources réelles (réactives au scope) ────────────────────────────────────

  /** Annuaire complet du workspace (résout userId → nom/couleur/email). */
  private readonly directory = toSignal(this.membersSvc.directory(), { initialValue: [] as Member[] });

  /** Membres : ceux du projet (scope projet) ou tout l'annuaire (scope workspace). */
  private readonly rawMembers = toSignal(
    toObservable(this.scope).pipe(switchMap(id =>
      id ? this.projectsSvc.members(id).pipe(map(pm => pm.map(m => m.userId))) : of(null))),
    { initialValue: null as string[] | null },
  );

  /** Tâches : celles du projet, ou l'agrégat de tous les projets. */
  private readonly rawTasks = toSignal(
    toObservable(this.scope).pipe(switchMap(id => this.tasksForScope(id))),
    { initialValue: [] as TaskCard[] },
  );

  /** Documents : ceux du projet, ou l'agrégat organisation + tous projets. */
  private readonly rawDocs = toSignal(
    toObservable(this.scope).pipe(switchMap(id => this.docsForScope(id))),
    { initialValue: [] as GedItem[] },
  );

  /** Canaux : ceux du projet, ou tous les canaux visibles du workspace. */
  private readonly rawChannels = toSignal(
    toObservable(this.scope).pipe(switchMap(id =>
      this.channelsSvc.list().pipe(map(list => this.channelsForScope(list, id))))),
    { initialValue: [] as Channel[] },
  );

  // ── Vues *Ref consommées par le picker ──────────────────────────────────────

  readonly members = computed<ProjectMemberRef[]>(() => {
    const dir = this.directory();
    const ids = this.rawMembers();
    // scope workspace (ids = null) → tout l'annuaire ; scope projet → filtré.
    const list = ids ? dir.filter(m => m.userId && ids.includes(m.userId)) : dir;
    return list.map(m => ({
      id: m.name, name: m.name,
      role: m.role || 'Membre',
      color: m.color ?? avatarColorFor(m.userId ?? m.name),
      email: m.email ?? '',
      online: m.online ?? false,
    }));
  });

  readonly tasks = computed<ProjectTaskRef[]>(() =>
    this.rawTasks().map(t => ({ id: t.taskKey, title: t.title, color: t.tag?.[1] })));

  readonly documents = computed<ProjectDocRef[]>(() =>
    this.rawDocs()
      .filter(it => it.type !== 'folder')
      .map(it => ({ id: it.name, name: it.name, type: it.type, owner: it.owner })));

  readonly channels = computed<ProjectChannelRef[]>(() =>
    this.rawChannels().map(c => ({ id: c.id, name: c.name, isProject: c.scope === 'project' })));

  // ── Résolution du contexte ──────────────────────────────────────────────────

  private parseContext(url: string): MentionContext {
    const p = url.match(/\/app\/projets\/([^/?#]+)/) || url.match(/\/app\/documents\/projets\/([^/?#]+)/);
    if (p) return { kind: 'project', id: decodeURIComponent(p[1]) };
    const c = url.match(/\/app\/canaux\/([^/?#]+)/);
    if (c) return { kind: 'channel', slug: decodeURIComponent(c[1]) };
    // conversations et tout autre contexte → workspace entier.
    return { kind: 'workspace' };
  }

  /** projectId ciblé (contexte projet, ou canal de projet), sinon null (workspace). */
  private resolveScope(ctx: MentionContext): Observable<string | null> {
    if (ctx.kind === 'project') return of(ctx.id);
    if (ctx.kind === 'channel') {
      return this.channelsSvc.list().pipe(map(list => {
        const chan = list.find(c => c.id === ctx.slug);
        // Canal de projet → scope projet ; canal d'organisation → workspace (null).
        return chan && chan.scope === 'project' ? (chan.projectId ?? null) : null;
      }));
    }
    return of(null);
  }

  // ── Agrégations par scope ───────────────────────────────────────────────────

  private tasksForScope(projectId: string | null): Observable<TaskCard[]> {
    if (projectId) {
      return this.tasksSvc.loadBoard(projectId).pipe(map(b => Object.values(b.cards).flat()));
    }
    // Workspace : union des tâches de tous les projets.
    return this.projectsSvc.list().pipe(switchMap(projects => {
      if (projects.length === 0) return of<TaskCard[]>([]);
      return forkJoin(projects.map(p =>
        this.tasksSvc.loadBoard(p.id).pipe(map(b => Object.values(b.cards).flat())),
      )).pipe(map(arrs => arrs.flat()));
    }));
  }

  private docsForScope(projectId: string | null): Observable<GedItem[]> {
    // Récursion complète : tous les fichiers de l'espace (racine + sous-dossiers).
    if (projectId) {
      return this.gedSvc.allFiles(projectId);
    }
    // Workspace : tous les fichiers de l'organisation + de chaque projet.
    return this.projectsSvc.list().pipe(switchMap(projects => {
      const calls = [this.gedSvc.allFiles(null), ...projects.map(p => this.gedSvc.allFiles(p.id))];
      return forkJoin(calls).pipe(map(arrs => arrs.flat()));
    }));
  }

  private channelsForScope(list: Channel[], projectId: string | null): Channel[] {
    if (projectId) {
      return list.filter(c => c.scope === 'project' && (c.projectId === projectId || !c.projectId));
    }
    return list; // workspace : tous les canaux visibles
  }
}
