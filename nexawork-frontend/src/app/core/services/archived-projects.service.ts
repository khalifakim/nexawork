import { Injectable, signal } from '@angular/core';

/**
 * Tracks the archived-project ids (slugs) of the active workspace.
 *
 * REF E : when a project is archived, its channels and its GED disappear from
 * the sidebar navigation (they stay reachable only from the archived project's
 * own tabs). We store the archived slugs here so the sidebar-2 can filter them
 * out of the Canaux and Documents sections in real time.
 *
 * Depuis I2, l'archivage est **persisté** côté backend (`POST /projects/{id}/archive`)
 * et `ProjectsService.list()` exclut déjà les archivés. Ce service ne sert donc
 * plus qu'à masquer **instantanément** un projet qu'on vient d'archiver dans les
 * barres latérales (retour visuel immédiat, sans refetch), et — tant que canaux
 * et GED restent en mock (I4/I5) — à filtrer leurs entrées côté navigation.
 */
@Injectable({ providedIn: 'root' })
export class ArchivedProjectsService {
  /** Ids des projets masqués localement (archivés dans cette session). */
  readonly ids = signal<Set<string>>(new Set());

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
