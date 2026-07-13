import { Injectable, Signal, computed, signal } from '@angular/core';
import { MonoTypeOperatorFunction, defer } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

/** Domaines dont les listes sont affichées dans les barres latérales. */
export type RefreshDomain = 'projects' | 'channels' | 'conversations';

/**
 * Déclencheurs de rafraîchissement partagés. Les listes chargées via
 * `workspaceSignal`/`workspaceQuery` refetchent quand le compteur de leur domaine
 * change — ce qui permet à une mutation (créer/archiver/supprimer un projet ou un
 * canal) faite dans un composant de se refléter dans les barres latérales, sans
 * recharger la page.
 *
 * Chaque domaine expose en plus un `busy(domain)` : vrai tant qu'une mutation est
 * en vol. Les sidebars affichent un loader sur `busy || loading`, ce qui couvre
 * TOUTE la fenêtre pendant laquelle la liste affichée est périmée :
 *
 *   mutation partie ──busy──▶ réponse ──bump──▶ refetch ──loading──▶ liste à jour
 *
 * Sans cela l'utilisateur voit le toast « canal supprimé » alors que le canal est
 * encore dans la sidebar (la suppression puis le rechargement sont deux allers-
 * retours réseau distincts) — et croit à une anomalie.
 */
@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  /** Bumpé après toute création/archivage/restauration/suppression de projet. */
  readonly projects = signal(0);
  bumpProjects(): void { this.projects.update(v => v + 1); }

  /** Bumpé après création/renommage/suppression d'un canal (rafraîchit les sidebars). */
  readonly channels = signal(0);
  bumpChannels(): void { this.channels.update(v => v + 1); }

  /** Bumpé après création/suppression d'une conversation. */
  readonly conversations = signal(0);
  bumpConversations(): void { this.conversations.update(v => v + 1); }

  // ─── Mutations en vol ─────────────────────────────────────────────────────
  // Des compteurs, et non des booléens : deux mutations concurrentes ne doivent
  // pas s'éteindre l'une l'autre (la première terminée couperait le loader alors
  // que la seconde est toujours en vol).
  private readonly pending: Record<RefreshDomain, ReturnType<typeof signal<number>>> = {
    projects: signal(0),
    channels: signal(0),
    conversations: signal(0),
  };

  /** Vrai tant qu'au moins une mutation du domaine est en vol. */
  busy(domain: RefreshDomain): Signal<boolean> {
    return computed(() => this.pending[domain]() > 0);
  }

  /**
   * Opérateur RxJS à brancher sur toute mutation d'un domaine affiché en sidebar.
   * Il marque le domaine « occupé » à la souscription, bumpe le compteur de
   * rafraîchissement en cas de succès, et libère l'état occupé à la fin — succès
   * OU erreur, pour ne jamais laisser un loader tourner indéfiniment.
   *
   *   this.delete$(...).pipe(this.refresh.mutating('channels')).subscribe();
   */
  mutating<T>(domain: RefreshDomain): MonoTypeOperatorFunction<T> {
    const counter = this.pending[domain];
    const bump = () => {
      if (domain === 'projects') this.bumpProjects();
      else if (domain === 'channels') this.bumpChannels();
      else this.bumpConversations();
    };
    return source => defer(() => {
      counter.update(v => v + 1);
      return source.pipe(
        tap(() => bump()),
        finalize(() => counter.update(v => Math.max(0, v - 1))),
      );
    });
  }
}
