import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mdp-nouveau',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <h1 class="nxf-h1">Nouveau mot de passe</h1>
    <p class="nxf-sub">Choisissez un nouveau mot de passe pour votre compte.</p>
    <div class="nxf-field">
      <label class="nxf-label">Nouveau mot de passe</label>
      <input class="nxf-input" type="password" placeholder="••••••••" />
    </div>
    <div class="nxf-field--last">
      <label class="nxf-label">Confirmer le mot de passe</label>
      <input class="nxf-input" type="password" placeholder="••••••••" />
    </div>
    <button class="nxf-primary" routerLink="/auth/login">Réinitialiser le mot de passe</button>
  `,
})
export class MdpNouveauComponent {}
