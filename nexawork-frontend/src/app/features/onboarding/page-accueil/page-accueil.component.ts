import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page d'accueil de l'auth. Les invitations arrivent **uniquement** par lien
 * email — le clic sur ce lien ouvre `/auth/invite?token=…`.
 */
@Component({
  selector: 'app-page-accueil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <h1 class="nxf-h1 nxf-h1--lg">Bienvenue sur nexa<span style="color:var(--nx-indigo)">work.</span></h1>
    <p class="nxf-sub">Connectez-vous à votre espace de travail ou créez un compte pour commencer.</p>
    <button class="nxf-primary" routerLink="/auth/login">Se connecter</button>
    <button class="nxf-secondary" routerLink="/auth/signup">Créer un compte</button>
  `,
  styles: [``],
})
export class PageAccueilComponent {}
