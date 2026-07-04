import { Injectable, signal } from '@angular/core';

/**
 * État partagé du parcours "Mot de passe oublié" — permet à l'écran de
 * confirmation d'affichage l'adresse email saisie à l'étape précédente.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetState {
  readonly email = signal('');
  reset(): void { this.email.set(''); }
}
