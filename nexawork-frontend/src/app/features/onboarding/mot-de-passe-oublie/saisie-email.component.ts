import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PasswordResetState } from '@core/services/password-reset.state';
import { AuthService } from '@core/services/auth.service';

/**
 * Étape 1 du reset mot de passe — saisie de l'email de compte.
 *
 * Après validation :
 *  - un email de réinitialisation est envoyé (simulé côté frontend-first),
 *  - l'utilisateur est redirigé vers l'écran de confirmation d'envoi
 *    (`/auth/forgot/sent`). Le vrai lien de reset arrive dans sa boîte mail
 *    et pointe vers `/auth/forgot/new` (avec un token côté back).
 */
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
      <input class="nxf-input" [class.nxf-input--err]="showError()" type="email" placeholder="vous@entreprise.com"
             [value]="email()" (input)="email.set($any($event.target).value)"
             (keydown.enter)="submit()" />
      @if (showError()) {
        <div class="nxf-err">Adresse email invalide.</div>
      }
    </div>
    <button class="nxf-primary" [disabled]="!canSubmit()" (click)="submit()">Envoyer le lien de réinitialisation</button>
  `,
  styles: [`
    .nxf-input--err { border-color: var(--nx-danger); }
    .nxf-input--err:focus { box-shadow: 0 0 0 3px rgba(245,86,78,.14); }
    .nxf-err { font-size: 12px; color: var(--nx-danger); margin-top: 6px; }
    .nxf-primary:disabled { background: #C9C5BD; box-shadow: none; cursor: not-allowed; }
  `],
})
export class MdpSaisieEmailComponent {
  private router = inject(Router);
  private state = inject(PasswordResetState);
  private auth = inject(AuthService);

  email = signal('');
  private touched = signal(false);

  private valid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim()));
  canSubmit = computed(() => this.valid());
  showError = computed(() => this.touched() && this.email().trim().length > 0 && !this.valid());

  submit(): void {
    this.touched.set(true);
    if (!this.canSubmit()) return;
    const email = this.email().trim();
    this.state.email.set(email);
    // Backend : envoi du lien (réponse silencieuse si le compte n'existe pas, §3.4).
    this.auth.passwordResetRequest(email).subscribe();
    this.router.navigate(['/auth/forgot/sent']);
  }
}
