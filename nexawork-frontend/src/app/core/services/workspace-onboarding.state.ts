import { Injectable, signal } from '@angular/core';

/**
 * État partagé du parcours de création du premier workspace (`/auth/workspace/*`).
 *
 * Les deux écrans (`configuration-espace` étape 1 et `inviter-equipe` étape 2)
 * lisent et écrivent ces signaux, ce qui permet de revenir de l'étape 2 à
 * l'étape 1 sans perdre les informations déjà saisies.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceOnboardingState {
  /** Nom de l'espace (étape 1). */
  readonly name = signal('');
  /** Slug généré / édité manuellement (étape 1). */
  readonly slug = signal('');
  /** Vrai dès que l'utilisateur a modifié le slug — on arrête d'auto-slugifier depuis le nom. */
  readonly slugTouched = signal(false);
  /** Couleur d'icône choisie (étape 1). */
  readonly color = signal('#6C70F0');

  /** Emails invités (étape 2). */
  readonly emails = signal<string[]>([]);
  /** Rôle appliqué aux invités (étape 2). */
  readonly role = signal<'Membre' | 'Administrateur'>('Membre');

  /** Reset complet — appelé à la fin du parcours (workspace créé). */
  reset(): void {
    this.name.set('');
    this.slug.set('');
    this.slugTouched.set(false);
    this.color.set('#6C70F0');
    this.emails.set([]);
    this.role.set('Membre');
  }
}
