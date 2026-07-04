import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page d'accueil de l'auth.
 *
 * En production, les invitations arrivent **uniquement** par lien email — le
 * clic sur ce lien redirige vers `/auth/invite` (avec un token en query param
 * côté back). Un raccourci **SIMU** est temporairement réintroduit ici pour
 * permettre le test du workflow complet côté frontend, avant retrait.
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

    <!-- SIMULATION — bouton à retirer avant mise en production. -->
    <div class="simu">
      <div class="simu__hd">
        <span class="simu__b">SIMU</span>
        <span class="simu__t">Outil de test — à retirer avant la mise en production.</span>
      </div>
      <button class="simu__btn" routerLink="/auth/invite">Simuler la réception d'une invitation</button>
    </div>
  `,
  styles: [`
    .simu { margin-top: 22px; padding: 12px 14px; border: 1px dashed #E0497B; border-radius: 12px; background: rgba(224,73,123,.05); display: flex; flex-direction: column; gap: 10px; }
    .simu__hd { display: flex; align-items: center; gap: 8px; }
    .simu__b  { flex: none; padding: 2px 7px; border-radius: 5px; background: #E0497B; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .05em; }
    .simu__t  { font-size: 11.5px; color: var(--nx-text-500); font-weight: 500; }
    .simu__btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 36px; border: 1px solid #E0497B; border-radius: 8px; background: #fff; color: #E0497B; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .simu__btn:hover { background: rgba(224,73,123,.08); }
  `],
})
export class PageAccueilComponent {}
