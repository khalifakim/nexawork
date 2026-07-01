import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-mdp-lien-envoye',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="nxf-circle" style="background:#E6F6EE;color:var(--nx-success)">
      <app-icon name="checkBig" [size]="28" [stroke]="2.4" />
    </div>
    <h1 class="nxf-h1">Email envoyé</h1>
    <p class="nxf-sub">Si un compte existe pour cet email, vous recevrez un lien de réinitialisation. Pensez à vérifier vos spams.</p>
    <button class="nxf-primary" routerLink="/auth/forgot/new">Définir un nouveau mot de passe</button>
    <button class="nxf-muted-link" routerLink="/auth/login">Retour à la connexion</button>
  `,
})
export class MdpLienEnvoyeComponent {}
