import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-param-securite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="set-page"><div class="set-inner">
      <h1 class="set-h1">Sécurité</h1>
      <p class="set-desc">Votre email de connexion et votre mot de passe.</p>

      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Email de connexion</b><small>Sert à vous identifier sur la plateforme.</small></div>
          <div class="set-rctrl" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div class="set-input set-input--locked" style="max-width:300px">akim.kone&#64;nexa.io</div>
            <span class="set-verified"><app-icon name="checkBig" [size]="14" />Adresse vérifiée</span>
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Changer d'adresse</b></div>
          <div class="set-rctrl">
            <div class="muted">Un lien de confirmation est envoyé à la nouvelle adresse. Le changement ne prend effet qu'une fois cette adresse vérifiée.</div>
            <button class="set-btn set-btn--ghost"><app-icon name="mail" [size]="16" />Modifier l'adresse e-mail</button>
          </div>
        </div>
      </div>

      <div class="set-card">
        <div class="set-row set-row--first"><div class="set-rlabel"><b>Mot de passe actuel</b></div><div class="set-rctrl"><div class="set-input">••••••••••</div></div></div>
        <div class="set-row set-row--top"><div class="set-rlabel"><b>Nouveau mot de passe</b><small>Au moins 8 caractères, avec une majuscule et un chiffre.</small></div><div class="set-rctrl"><div class="set-input"></div></div></div>
        <div class="set-row"><div class="set-rlabel"><b>Confirmer</b></div><div class="set-rctrl"><div class="set-input"></div></div></div>
        <div class="set-row"><div class="set-rlabel"></div><div class="set-rctrl"><button class="set-btn set-btn--primary">Mettre à jour le mot de passe</button></div></div>
      </div>

      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Mot de passe oublié</b></div>
          <div class="set-rctrl">
            <div class="muted">Recevez un lien de réinitialisation par email pour définir un nouveau mot de passe sans connaître l'actuel.</div>
            <button class="set-btn set-btn--ghost"><app-icon name="refresh" [size]="16" />Envoyer un lien de réinitialisation</button>
          </div>
        </div>
      </div>
    </div></div>
  `,
  styles: [`.muted { font-size: 13px; color: var(--nx-text-500); line-height: 1.5; margin-bottom: 12px; max-width: 440px; }`],
})
export class ParamSecuriteComponent {}
