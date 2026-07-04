import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';
import { PasswordResetState } from '@core/services/password-reset.state';

/**
 * Écran de confirmation « Email envoyé ».
 *
 * Design harmonisé au reste de l'interface :
 *  - cercle icône avec ring subtil (2 couches),
 *  - badge affichant l'adresse email destinataire,
 *  - carte "conseil" avec liste de checks,
 *  - hiérarchie boutons : primaire (Retour connexion) + lien discret (renvoyer).
 *
 * Le raccourci « Définir un nouveau mot de passe » a été retiré : le vrai lien
 * arrive par email et pointe vers `/auth/forgot/new`. En mode simulation, un
 * bouton **SIMU** permet de sauter cet aller-retour pour tester le workflow.
 */
@Component({
  selector: 'app-mdp-lien-envoye',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="wrap">
      <!-- Cercle icône avec double ring -->
      <div class="ic">
        <div class="ic__ring"></div>
        <div class="ic__inner"><app-icon name="mail" [size]="30" [stroke]="1.9" /></div>
      </div>

      <h1 class="ttl">Email envoyé</h1>
      <p class="sub">Consultez votre boîte mail et cliquez sur le lien reçu pour définir un nouveau mot de passe.</p>

      <!-- Badge destinataire -->
      @if (state.email()) {
        <div class="dest">
          <span class="dest__ic"><app-icon name="mail" [size]="14" [stroke]="2" /></span>
          <span class="dest__t">Envoyé à</span>
          <span class="dest__e">{{ state.email() }}</span>
        </div>
      }

      <!-- Carte "conseils" -->
      <div class="tips">
        <div class="tip">
          <span class="tip__dot"></span>
          <span>Le lien est valable pendant <b>1 heure</b>.</span>
        </div>
        <div class="tip">
          <span class="tip__dot"></span>
          <span>Si vous ne voyez pas l'email, vérifiez vos <b>spams</b> ou <b>courriers indésirables</b>.</span>
        </div>
        <div class="tip">
          <span class="tip__dot"></span>
          <span>Si aucun compte n'existe pour cet email, aucun message ne sera envoyé.</span>
        </div>
      </div>

      <!-- Actions -->
      <button class="primary" routerLink="/auth/login">Retour à la connexion</button>
      <button class="ghost" (click)="resend()"><app-icon name="rotateCcw" [size]="14" [stroke]="2" />Renvoyer l'email</button>

      <!-- SIMULATION -->
      <div class="simu">
        <div class="simu__hd">
          <span class="simu__b">SIMU</span>
          <span class="simu__t">Outils de test — à retirer avant la mise en production.</span>
        </div>
        <button class="simu__btn" (click)="simulateClick()">
          <app-icon name="link" [size]="14" [stroke]="2" />Simuler le clic sur le lien reçu
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wrap { display: flex; flex-direction: column; align-items: center; text-align: center; }

    /* Icône : cercle indigo avec double halo. */
    .ic { position: relative; width: 80px; height: 80px; margin: 0 auto 20px; }
    .ic__ring { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 50% 50%, rgba(91,95,233,.14) 0%, rgba(91,95,233,0) 70%); }
    .ic__inner { position: absolute; inset: 12px; border-radius: 50%; background: var(--nx-indigo); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 26px rgba(91,95,233,.32), inset 0 0 0 4px rgba(255,255,255,.15); }

    .ttl { margin: 0 0 8px; font-size: 22px; font-weight: 700; letter-spacing: -.02em; color: var(--nx-text); }
    .sub { margin: 0 0 18px; font-size: 13.5px; color: var(--nx-text-500); line-height: 1.5; max-width: 340px; }

    /* Badge destinataire (email envoyé à …). */
    .dest { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--nx-indigo-50); color: var(--nx-indigo-text); font-size: 12.5px; font-weight: 600; margin-bottom: 20px; max-width: 100%; box-sizing: border-box; }
    .dest__ic { display: flex; color: var(--nx-indigo); flex: none; }
    .dest__t { color: var(--nx-text-500); font-weight: 500; flex: none; }
    .dest__e { font-family: var(--nx-mono, ui-monospace, monospace); font-size: 12.5px; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }

    /* Conseils : liste de bullets discrets. */
    .tips { width: 100%; box-sizing: border-box; padding: 14px 16px; border: 1px solid var(--nx-border); border-radius: 12px; background: #fff; display: flex; flex-direction: column; gap: 9px; margin-bottom: 22px; }
    .tip { display: flex; align-items: flex-start; gap: 10px; font-size: 12.5px; color: var(--nx-text-700); line-height: 1.5; text-align: left; }
    .tip__dot { flex: none; width: 5px; height: 5px; border-radius: 50%; background: var(--nx-indigo); margin-top: 7px; }
    .tip b { font-weight: 700; color: var(--nx-text); }

    /* Boutons — primaire pleine largeur, ghost discret dessous. */
    .primary { width: 100%; height: 44px; border: none; border-radius: 10px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(91,95,233,.28); margin-bottom: 10px; }
    .primary:hover { background: var(--nx-indigo-hover); }
    .ghost { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--nx-text-500); font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; padding: 6px 10px; }
    .ghost:hover { color: var(--nx-indigo); }

    /* Bloc simulation — encart clairement identifié. */
    .simu { width: 100%; box-sizing: border-box; margin-top: 22px; padding: 12px 14px; border: 1px dashed #E0497B; border-radius: 12px; background: rgba(224,73,123,.05); display: flex; flex-direction: column; gap: 10px; text-align: left; }
    .simu__hd { display: flex; align-items: center; gap: 8px; }
    .simu__b  { flex: none; padding: 2px 7px; border-radius: 5px; background: #E0497B; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .05em; }
    .simu__t  { font-size: 11.5px; color: var(--nx-text-500); font-weight: 500; }
    .simu__btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; height: 36px; border: 1px solid #E0497B; border-radius: 8px; background: #fff; color: #E0497B; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .simu__btn:hover { background: rgba(224,73,123,.08); }
  `],
})
export class MdpLienEnvoyeComponent {
  private router = inject(Router);
  private toast = inject(ToastService);
  state = inject(PasswordResetState);

  resend(): void {
    this.toast.show({ message: 'Nouvel email de réinitialisation envoyé.' });
  }

  /** SIMU — sauter la boîte mail et ouvrir directement le formulaire de reset. */
  simulateClick(): void {
    this.router.navigate(['/auth/forgot/new']);
  }
}
