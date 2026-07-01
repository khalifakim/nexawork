import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-mdp-saisie-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <button class="nxf-back" routerLink="/auth/login"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour à la connexion</button>
    <h1 class="nxf-h1">Mot de passe oublié</h1>
    <p class="nxf-sub">Saisissez votre email : nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
    <div class="nxf-field--last">
      <label class="nxf-label">Adresse email</label>
      <input class="nxf-input" type="email" placeholder="vous@entreprise.com" />
    </div>
    <button class="nxf-primary" routerLink="/auth/forgot/sent">Envoyer le lien de réinitialisation</button>
  `,
})
export class MdpSaisieEmailComponent {}
