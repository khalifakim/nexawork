import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-connexion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <button class="nxf-back" routerLink="/auth/landing"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour</button>
    <h1 class="nxf-h1">Se connecter</h1>
    <p class="nxf-sub">Accédez à votre espace de travail NexaWork.</p>
    <div class="nxf-field">
      <label class="nxf-label">Adresse email</label>
      <input class="nxf-input" type="email" placeholder="vous@entreprise.com" value="akim.kone@nexa.io" />
    </div>
    <div class="nxf-field--last">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
        <label class="nxf-label" style="margin:0">Mot de passe</label>
        <button class="nxf-link" style="font-size:12.5px" routerLink="/auth/forgot/email">Mot de passe oublié ?</button>
      </div>
      <input class="nxf-input" type="password" placeholder="••••••••" />
    </div>
    <button class="nxf-primary" routerLink="/auth/selector">Se connecter</button>
    <p class="nxf-foot">Pas encore de compte ? <button class="nxf-link" routerLink="/auth/signup">Créer un compte</button></p>
  `,
})
export class ConnexionComponent {}
