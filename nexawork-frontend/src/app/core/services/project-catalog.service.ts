import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
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
import { avatarColorFor } from '@core/util/ui.util';

/**
 * Catalogue du projet courant (membres / tâches / documents / canaux) consommé
 * par le sélecteur de mentions des commentaires. Les données sont **réelles** :
 * elles proviennent des services de domaine, filtrées sur le projet résolu depuis
 * l'URL (`/app/projets/:id/…` ou `/app/documents/projets/:id`). Hors contexte
 * projet, les listes sont vides (le picker affiche alors un message explicite).
 */
@Injectable({ providedIn: 'root' })
export class ProjectCatalogService {
  private readonly router = inject(Router);
  private readonly membersSvc = inject(MembersService);
  private readonly projectsSvc = inject(ProjectsService);
  private readonly tasksSvc = inject(TasksService);
  private readonly gedSvc = inject(GedService);
  private readonly channelsSvc = inject(ChannelsService);

  /** UUID du projet courant (depuis l'URL), ou `null` hors contexte projet. */
  private readonly projectId = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.resolveProjectId(this.router.url)),
      startWith(this.resolveProjectId(this.router.url)),
    ),
    { initialValue: this.resolveProjectId(this.router.url) },
  );

  readonly currentProjectId = computed(() => this.projectId());

  // ── Sources réelles ─────────────────────────────────────────────────────────

  /** Annuaire du workspace (résout userId → nom/couleur). */
  private readonly directory = toSignal(this.membersSvc.directory(), { initialValue: [] as Member[] });

  /** Membres réels du projet courant. */
  private readonly projectMembers = toSignal(
    toObservable(this.projectId).pipe(switchMap(id => id ? this.projectsSvc.members(id) : of([]))),
    { initialValue: [] },
  );

  /** Cartes (tâches) réelles du projet courant. */
  private readonly projectTasks = toSignal(
    toObservable(this.projectId).pipe(switchMap(id =>
      id ? this.tasksSvc.loadBoard(id).pipe(map(b => Object.values(b.cards).flat())) : of([]))),
    { initialValue: [] },
  );

  /** Documents (fichiers) réels du projet courant — racine de l'espace projet. */
  private readonly projectDocs = toSignal(
    toObservable(this.projectId).pipe(switchMap(id =>
      id ? this.gedSvc.folderContent([], id) : of([]))),
    { initialValue: [] },
  );

  /** Canaux réels du projet courant. */
  private readonly projectChannels = toSignal(
    toObservable(this.projectId).pipe(switchMap(id =>
      id ? this.channelsSvc.list().pipe(map(list =>
        list.filter(c => c.scope === 'project' && (c.projectId === id || !c.projectId)))) : of([]))),
    { initialValue: [] },
  );

  // ── Vues consommées par le picker (formes *Ref) ─────────────────────────────

  readonly members = computed<ProjectMemberRef[]>(() => {
    const byId = new Map(this.directory().filter(m => m.userId).map(m => [m.userId!, m] as const));
    return this.projectMembers().map(pm => {
      const m = byId.get(pm.userId);
      const name = m?.name ?? 'Membre';
      return {
        id: name,
        name,
        role: pm.isProjectLead || pm.projectRole === 'PROJECT_LEAD' ? 'Chef de projet' : 'Membre',
        color: m?.color ?? avatarColorFor(pm.userId),
        email: m?.email ?? '',
        online: m?.online ?? false,
      };
    });
  });

  readonly tasks = computed<ProjectTaskRef[]>(() =>
    this.projectTasks().map(t => ({ id: t.taskKey, title: t.title, color: t.tag?.[1] })));

  readonly documents = computed<ProjectDocRef[]>(() =>
    this.projectDocs()
      .filter(it => it.type !== 'folder')
      .map(it => ({ id: it.name, name: it.name, type: it.type, owner: it.owner })));

  readonly channels = computed<ProjectChannelRef[]>(() =>
    this.projectChannels().map(c => ({ id: c.id, name: c.name, isProject: true })));

  /**
   * Extrait l'id du projet de l'URL. Motifs reconnus :
   *   /app/projets/:id/...
   *   /app/documents/projets/:id
   * Tout autre contexte renvoie `null` (catalogue vide).
   */
  private resolveProjectId(url: string): string | null {
    const m = url.match(/\/app\/projets\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    const m2 = url.match(/\/app\/documents\/projets\/([^/?#]+)/);
    if (m2) return decodeURIComponent(m2[1]);
    return null;
  }
}
