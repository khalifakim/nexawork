import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import {
  ProjectChannelRef,
  ProjectDocRef,
  ProjectMemberRef,
  ProjectTaskRef,
} from '@core/models/mention.models';
import { DEFAULT_PROJECT_ID, PROJECT_CATALOG } from '@core/mock/project-catalog';

interface ProjectCatalog {
  members: ProjectMemberRef[];
  tasks: ProjectTaskRef[];
  documents: ProjectDocRef[];
  channels: ProjectChannelRef[];
}

/**
 * Exposes the project-scoped catalog (members/tasks/docs/channels) used by the
 * comment mention picker. The project id is resolved from the active route —
 * any URL whose first segment after `/app/projets/` is the project slug.
 *
 * When the URL does not match (e.g. when the picker is opened from a non-Kanban
 * context), the catalog falls back to `DEFAULT_PROJECT_ID`.
 */
@Injectable({ providedIn: 'root' })
export class ProjectCatalogService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Reactive project id (slug from the URL). */
  private readonly projectId = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.resolveProjectId(this.router.url)),
      startWith(this.resolveProjectId(this.router.url)),
    ),
    { initialValue: this.resolveProjectId(this.router.url) },
  );

  readonly currentProjectId = computed(() => this.projectId());

  private readonly catalog = computed<ProjectCatalog>(() => {
    const id = this.projectId();
    return PROJECT_CATALOG[id] ?? PROJECT_CATALOG[DEFAULT_PROJECT_ID];
  });

  readonly members   = computed(() => this.catalog().members);
  readonly tasks     = computed(() => this.catalog().tasks);
  readonly documents = computed(() => this.catalog().documents);
  readonly channels  = computed(() => this.catalog().channels);

  /**
   * Extracts the project id from the current URL. Recognised patterns:
   *   /app/projets/:id/...
   *   /app/documents/projets/:id
   * Anything else returns the default.
   */
  private resolveProjectId(url: string): string {
    const m = url.match(/\/app\/projets\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    const m2 = url.match(/\/app\/documents\/projets\/([^/?#]+)/);
    if (m2) return decodeURIComponent(m2[1]);
    return DEFAULT_PROJECT_ID;
  }
}
