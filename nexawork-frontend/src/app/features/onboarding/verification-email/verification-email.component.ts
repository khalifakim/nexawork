import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-verification-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="nxf-circle" style="background:var(--nx-indigo-50);color:var(--nx-indigo)">
      <app-icon name="mail" [size]="27" />
    </div>
    <h1 class="nxf-h1">Vérifiez votre boîte mail</h1>
    <p class="nxf-sub">Nous avons envoyé un lien de confirmation à <span style="color:var(--nx-text);font-weight:600">votre adresse email</span>. Cliquez dessus pour activer votre compte.</p>
    <button class="nxf-primary" routerLink="/auth/workspace/name">J'ai confirmé mon email</button>
    <button class="nxf-muted-link">Renvoyer l'email</button>
  `,
})
export class VerificationEmailComponent {}
