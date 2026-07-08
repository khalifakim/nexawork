import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';
import { SessionService } from '@core/services/session.service';
import { AuthService } from '@core/services/auth.service';

/** « Sécurité » — email display + password change + reset-link. Fidèle à `settingsSecurite()`. */
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
            <div class="set-input set-input--locked" style="max-width:300px">{{ email() }}</div>
            <span class="set-verified"><app-icon name="check" [size]="14" />Adresse vérifiée</span>
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Changer d'adresse</b></div>
          <div class="set-rctrl">
            <div class="muted">Un lien de confirmation est envoyé à la nouvelle adresse. Le changement ne prend effet qu'une fois cette adresse vérifiée.</div>
            <button class="set-btn set-btn--ghost" (click)="askEmailChange()">
              <app-icon name="mail" [size]="16" />Modifier l'adresse e-mail
            </button>
          </div>
        </div>
      </div>

      <div class="set-card">
        <div class="set-row set-row--first">
          <div class="set-rlabel"><b>Mot de passe actuel</b></div>
          <div class="set-rctrl">
            <input class="set-input" type="password" [value]="current()" (input)="current.set($any($event.target).value)" placeholder="••••••••••" />
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Nouveau mot de passe</b><small>Au moins 8 caractères, avec une majuscule et un chiffre.</small></div>
          <div class="set-rctrl">
            <input class="set-input" type="password" [value]="next()" (input)="next.set($any($event.target).value)" />
            @if (next().length > 0 && !strong()) {
              <div class="err">Le mot de passe ne respecte pas les critères.</div>
            }
          </div>
        </div>
        <div class="set-row set-row--top">
          <div class="set-rlabel"><b>Confirmer</b></div>
          <div class="set-rctrl">
            <input class="set-input" type="password" [value]="confirm()" (input)="confirm.set($any($event.target).value)" />
            @if (confirm().length > 0 && confirm() !== next()) {
              <div class="err">Les mots de passe ne correspondent pas.</div>
            }
          </div>
        </div>
        <div class="set-row">
          <div class="set-rlabel"></div>
          <div class="set-rctrl">
            <button class="set-btn set-btn--primary" [disabled]="!canSubmit()" (click)="updatePassword()">
              Mettre à jour le mot de passe
            </button>
          </div>
        </div>
      </div>

      <div class="set-card">
        <div class="set-row set-row--first set-row--top">
          <div class="set-rlabel"><b>Mot de passe oublié</b></div>
          <div class="set-rctrl">
            <div class="muted">Recevez un lien de réinitialisation par email pour définir un nouveau mot de passe sans connaître l'actuel.</div>
            <button class="set-btn set-btn--ghost" (click)="sendResetLink()">
              <app-icon name="refresh" [size]="16" />Envoyer un lien de réinitialisation
            </button>
          </div>
        </div>
      </div>
    </div></div>
  `,
  styles: [`
    .set-input { display: flex; align-items: center; font-family: inherit; }
    input.set-input { padding: 0 13px; }
    .muted { font-size: 13px; color: var(--nx-text-500); line-height: 1.5; margin-bottom: 12px; max-width: 440px; }
    .err { font-size: 12px; color: var(--nx-danger); margin-top: 6px; }
    .set-btn:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class ParamSecuriteComponent {
  private toast = inject(ToastService);
  private session = inject(SessionService);
  private auth = inject(AuthService);

  /** Email de connexion réel de l'utilisateur courant. */
  email = computed(() => this.session.user()?.email ?? '—');

  current = signal('');
  next = signal('');
  confirm = signal('');

  strong = computed(() => {
    const p = this.next();
    return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
  });

  canSubmit = computed(() =>
    this.current().length > 0 && this.strong() && this.confirm() === this.next(),
  );

  updatePassword(): void {
    if (!this.canSubmit()) return;
    this.auth.changePassword(this.current(), this.next()).subscribe({
      next: () => {
        this.toast.show({ message: 'Mot de passe mis à jour' });
        this.current.set(''); this.next.set(''); this.confirm.set('');
      },
    });
  }

  sendResetLink(): void {
    const email = this.email();
    this.auth.passwordResetRequest(email).subscribe();
    this.toast.show({ message: 'Lien de réinitialisation envoyé à ' + email });
  }

  askEmailChange(): void {
    const newEmail = window.prompt('Nouvelle adresse email :', '')?.trim();
    if (!newEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) {
      this.toast.show({ message: 'Adresse email invalide.', icon: 'warning' });
      return;
    }
    this.auth.changeEmail(newEmail).subscribe({
      next: () => this.toast.show({
        message: 'Un lien de confirmation a été envoyé à ' + newEmail + '. Le changement prend effet après vérification.',
      }),
    });
  }
}
