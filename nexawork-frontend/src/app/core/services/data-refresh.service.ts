import { Injectable, signal } from '@angular/core';

/**
 * Déclencheurs de rafraîchissement partagés. Les listes chargées via
 * `workspaceSignal` refetchent quand le compteur de leur domaine change — ce qui
 * permet à une mutation (créer/archiver/supprimer un projet) faite dans un
 * composant de se refléter dans les barres latérales, sans recharger la page.
 */
@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  /** Bumpé après toute création/archivage/restauration/suppression de projet. */
  readonly projects = signal(0);

  bumpProjects(): void { this.projects.update(v => v + 1); }

  /** Bumpé après création/suppression d'un canal (rafraîchit les sidebars). */
  readonly channels = signal(0);

  bumpChannels(): void { this.channels.update(v => v + 1); }
}
