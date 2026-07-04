import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';

/**
 * Écran "Vérifiez votre boîte mail" après création de compte.
 *
 * En production, l'utilisateur doit cliquer sur le lien reçu par email pour
 * activer son compte — ce lien pointe vers `/auth/workspace/name`. Un bouton
 * **SIMU** est temporairement présent ici pour permettre de sauter cet
 * aller-retour et tester le workflow complet. À retirer en production.
 */
@Component({
  selector: 'app-verification-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <button class="nxf-back" routerLink="/auth/signup"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour</button>
    <div class="nxf-circle" style="background:var(--nx-indigo-50);color:var(--nx-indigo)">
      <app-icon name="mail" [size]="27" />
    </div>
    <h1 class="nxf-h1">Vérifiez votre boîte mail</h1>
    <p class="nxf-sub">Nous avons envoyé un lien de confirmation à <span style="color:var(--nx-text);font-weight:600">votre adresse email</span>. Cliquez dessus pour activer votre compte.</p>
    <button class="nxf-muted-link" (click)="resend()">Renvoyer l'email</button>

    <!-- SIMULATION — à retirer avant mise en production. -->
    <div class="simu">
      <div class="simu__hd">
        <span class="simu__b">SIMU</span>
        <span class="simu__t">Outil de test — à retirer avant la mise en production.</span>
      </div>
      <button class="simu__btn" routerLink="/auth/workspace/name">
        <app-icon name="check" [size]="14" [stroke]="2.2" />Simuler la confirmation email
      </button>
    </div>
  `,
  styles: [`
    .simu { margin-top: 22px; padding: 12px 14px; border: 1px dashed #E0497B; border-radius: 12px; background: rgba(224,73,123,.05); display: flex; flex-direction: column; gap: 10px; }
    .simu__hd { display: flex; align-items: center; gap: 8px; }
    .simu__b  { flex: none; padding: 2px 7px; border-radius: 5px; background: #E0497B; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .05em; }
    .simu__t  { font-size: 11.5px; color: var(--nx-text-500); font-weight: 500; }
    .simu__btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; height: 36px; border: 1px solid #E0497B; border-radius: 8px; background: #fff; color: #E0497B; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .simu__btn:hover { background: rgba(224,73,123,.08); }
  `],
})
export class VerificationEmailComponent {
  private toast = inject(ToastService);
  resend(): void {
    this.toast.show({ message: 'Nouvel email de confirmation envoyé.' });
  }
}
