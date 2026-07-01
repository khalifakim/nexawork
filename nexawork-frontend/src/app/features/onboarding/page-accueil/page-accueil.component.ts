import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
    <div class="nxf-or"><div></div><span>ou</span><div></div></div>
    <button class="nxf-link" style="width:100%;padding:6px" routerLink="/auth/invite">J'ai reçu une invitation</button>
  `,
})
export class PageAccueilComponent {}
