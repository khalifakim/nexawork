import { Injectable, signal } from '@angular/core';

/**
 * État du parcours de création du premier workspace (`/auth/workspace/name`).
 *
 * Parcours en **étape unique** : l'espace est créé puis ouvert directement.
 * Les membres s'invitent ensuite depuis Paramètres ▸ Invitations.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceOnboardingState {
  /** Nom de l'espace. */
  readonly name = signal('');
  /** Slug généré / édité manuellement. */
  readonly slug = signal('');
  /** Vrai dès que l'utilisateur a modifié le slug — on arrête d'auto-slugifier depuis le nom. */
  readonly slugTouched = signal(false);
  /** Couleur d'icône choisie. */
  readonly color = signal('#6C70F0');

  /** Reset complet — appelé à la fin du parcours (workspace créé). */
  reset(): void {
    this.name.set('');
    this.slug.set('');
    this.slugTouched.set(false);
    this.color.set('#6C70F0');
  }
}
