import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-inscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <button class="nxf-back" routerLink="/auth/landing"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour</button>
    <h1 class="nxf-h1">Créer un compte</h1>
    <p class="nxf-sub">Quelques informations pour démarrer votre espace.</p>
    <div style="display:flex;gap:12px" class="nxf-field">
      <div style="flex:1">
        <label class="nxf-label">Prénom</label>
        <input class="nxf-input" placeholder="Akim" />
      </div>
      <div style="flex:1">
        <label class="nxf-label">Nom</label>
        <input class="nxf-input" placeholder="Koné" />
      </div>
    </div>
    <div class="nxf-field">
      <label class="nxf-label">Adresse email</label>
      <input class="nxf-input" type="email" placeholder="vous@entreprise.com" />
    </div>
    <div class="nxf-field">
      <label class="nxf-label">Mot de passe</label>
      <input class="nxf-input" type="password" placeholder="8 caractères minimum" />
    </div>
    <div class="nxf-field--last">
      <label class="nxf-label">Fonction</label>
      <input class="nxf-input" placeholder="Designer, Développeur, Chef de produit…" />
    </div>
    <button class="nxf-primary" routerLink="/auth/verify">Créer mon compte</button>
    <p class="nxf-foot">Déjà un compte ? <button class="nxf-link" routerLink="/auth/login">Se connecter</button></p>
  `,
})
export class InscriptionComponent {}
