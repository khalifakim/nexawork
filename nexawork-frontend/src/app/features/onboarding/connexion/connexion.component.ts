import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AuthActions } from '@store/auth/auth.actions';
import { selectAuthError, selectAuthLoading } from '@store/auth/auth.selectors';

/**
 * Connexion — formulaire réactif branché sur le store auth (AuthActions.login).
 * L'effet `login$` appelle le backend ; en succès, redirection vers le sélecteur
 * d'espaces (§3.1). L'erreur backend s'affiche inline sous le formulaire.
 */
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
      <input class="nxf-input" type="email" placeholder="vous@entreprise.com"
             [value]="email()" (input)="email.set($any($event.target).value)"
             (keyup.enter)="submit()" />
    </div>
    <div class="nxf-field--last">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
        <label class="nxf-label" style="margin:0">Mot de passe</label>
        <button class="nxf-link" style="font-size:12.5px" routerLink="/auth/forgot/email">Mot de passe oublié ?</button>
      </div>
      <input class="nxf-input" type="password" placeholder="••••••••"
             [value]="password()" (input)="password.set($any($event.target).value)"
             (keyup.enter)="submit()" />
    </div>
    @if (error()) {
      <div class="nxf-error">{{ error() }}</div>
    }
    <button class="nxf-primary" [disabled]="!canSubmit() || loading()" (click)="submit()">
      {{ loading() ? 'Connexion…' : 'Se connecter' }}
    </button>
    <p class="nxf-foot">Pas encore de compte ? <button class="nxf-link" routerLink="/auth/signup">Créer un compte</button></p>
  `,
  styles: [`
    :host { display: block; }
    .nxf-error { font-size: 12px; color: var(--nx-danger); margin: 2px 0 10px; }
    .nxf-primary:disabled { background: #C9C5BD; box-shadow: none; cursor: not-allowed; }
  `],
})
export class ConnexionComponent {
  private readonly store = inject(Store);

  email = signal('');
  password = signal('');

  readonly loading = toSignal(this.store.select(selectAuthLoading), { initialValue: false });
  readonly error = toSignal(this.store.select(selectAuthError), { initialValue: null });

  readonly canSubmit = computed(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim());
    return emailOk && this.password().length > 0;
  });

  submit(): void {
    if (!this.canSubmit() || this.loading()) return;
    this.store.dispatch(AuthActions.login({
      request: { email: this.email().trim(), password: this.password() },
    }));
  }
}
