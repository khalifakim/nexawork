import { Injectable, signal } from '@angular/core';

/**
 * Tracks the archived-project ids (slugs) of the active workspace.
 *
 * REF E : when a project is archived, its channels and its GED disappear from
 * the sidebar navigation (they stay reachable only from the archived project's
 * own tabs). We store the archived slugs here so the sidebar-2 can filter them
 * out of the Canaux and Documents sections in real time.
 *
 * The service is intentionally minimalist for the frontend-first phase — the
 * backend will replace `ids` with a persistent list from `GET /projects?archived=true`.
 */
@Injectable({ providedIn: 'root' })
export class ArchivedProjectsService {
  /** Signal of archived project ids (slugified names). */
  readonly ids = signal<Set<string>>(new Set(['ancienne-landing-2024', 'refonte-newsletter']));

  /** Convenience: is this project id archived? */
  isArchived(id: string): boolean { return this.ids().has(id); }

  archive(id: string): void {
    this.ids.update(set => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
  }

  restore(id: string): void {
    this.ids.update(set => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }
}
