import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AuthActions } from '@store/auth/auth.actions';
import { selectAuthError, selectAuthLoading } from '@store/auth/auth.selectors';

/**
 * Formulaire de création de compte — compact, tient dans la vue sans scroll.
 * Ajout d'une confirmation de mot de passe (rejeu strict) avant validation.
 */
@Component({
  selector: 'app-inscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <button class="su-back" routerLink="/auth/landing"><app-icon name="chevronLeft" [size]="14" [stroke]="2.2" />Retour</button>
    <h1 class="su-h1">Créer un compte</h1>
    <p class="su-sub">Quelques informations pour démarrer votre espace.</p>

    <div class="su-row">
      <div class="su-field">
        <label class="su-label">Prénom</label>
        <input class="su-input" placeholder="Akim"
               [value]="firstName()" (input)="firstName.set($any($event.target).value)" />
      </div>
      <div class="su-field">
        <label class="su-label">Nom</label>
        <input class="su-input" placeholder="Koné"
               [value]="lastName()" (input)="lastName.set($any($event.target).value)" />
      </div>
    </div>

    <div class="su-field">
      <label class="su-label">Adresse email</label>
      <input class="su-input" type="email" placeholder="vous@entreprise.com"
             [value]="email()" (input)="email.set($any($event.target).value)" />
    </div>

    <div class="su-row">
      <div class="su-field">
        <label class="su-label">Mot de passe</label>
        <input class="su-input" type="password" placeholder="8 caractères min."
               [value]="password()" (input)="password.set($any($event.target).value)" />
      </div>
      <div class="su-field">
        <label class="su-label">Confirmation</label>
        <input class="su-input" [class.su-input--err]="passwordMismatch()" type="password" placeholder="Répétez"
               [value]="confirm()" (input)="confirm.set($any($event.target).value)" />
      </div>
    </div>
    @if (passwordMismatch()) {
      <div class="su-err">Les deux mots de passe ne correspondent pas.</div>
    }

    <div class="su-field su-field--last">
      <label class="su-label">Fonction</label>
      <input class="su-input" placeholder="Designer, Développeur, Chef de produit…"
             [value]="fn()" (input)="fn.set($any($event.target).value)" />
    </div>

    @if (error()) {
      <div class="su-err" style="margin:2px 0 8px">{{ error() }}</div>
    }
    <button class="su-primary" [disabled]="loading()" (click)="submit()">
      {{ loading() ? 'Création…' : 'Créer mon compte' }}
    </button>
    <p class="su-foot">Déjà un compte ? <button class="su-link" routerLink="/auth/login">Se connecter</button></p>
  `,
  styles: [`
    :host { display: block; }
    .su-back { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--nx-text-500);
      font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 12px; }
    .su-back:hover { color: var(--nx-text-700); }
    .su-h1 { font-size: 21px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 4px; color: var(--nx-text); }
    .su-sub { font-size: 12.5px; color: var(--nx-text-500); line-height: 1.4; margin: 0 0 12px; }
    .su-row { display: flex; gap: 8px; }
    .su-field { flex: 1; margin-bottom: 8px; }
    .su-field--last { margin-bottom: 12px; }
    .su-label { display: block; font-size: 11.5px; font-weight: 600; color: var(--nx-text-700); margin-bottom: 3px; }
    .su-input { width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--nx-border);
      background: #fff; font-family: inherit; font-size: 13px; color: var(--nx-text); outline: none; box-sizing: border-box; }
    .su-input:focus { border-color: var(--nx-indigo); box-shadow: 0 0 0 2.5px rgba(91,95,233,.15); }
    .su-input--err { border-color: var(--nx-danger); }
    .su-input--err:focus { box-shadow: 0 0 0 2.5px rgba(245,86,78,.14); }
    .su-err { font-size: 11.5px; color: var(--nx-danger); margin: -4px 0 8px; }
    .su-primary { width: 100%; height: 40px; border: none; border-radius: 8px; background: var(--nx-indigo);
      color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 16px rgba(91,95,233,.30); }
    .su-primary:hover:not(:disabled) { background: var(--nx-indigo-hover); }
    .su-primary:disabled { background: #C9C5BD; box-shadow: none; cursor: not-allowed; }
    .su-foot { text-align: center; font-size: 12.5px; color: var(--nx-text-500); margin: 12px 0 0; }
    .su-link { background: none; border: none; color: var(--nx-indigo); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 0; }
  `],
})
export class InscriptionComponent {
  private readonly store = inject(Store);

  readonly loading = toSignal(this.store.select(selectAuthLoading), { initialValue: false });
  readonly error = toSignal(this.store.select(selectAuthError), { initialValue: null });

  firstName = signal('');
  lastName  = signal('');
  email     = signal('');
  password  = signal('');
  confirm   = signal('');
  fn        = signal('');

  passwordMismatch = computed(() => {
    const c = this.confirm();
    return c.length > 0 && c !== this.password();
  });

  canSubmit = computed(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim());
    const pwd = this.password();
    return this.firstName().trim().length > 0
        && this.lastName().trim().length > 0
        && emailOk
        && pwd.length >= 8
        && pwd === this.confirm();
  });

  /**
   * Inscription (§3.5). Dispatche `register` ; l'effet `register$` appelle le
   * backend puis redirige vers `/auth/verify`. Les erreurs inline (mots de passe)
   * restent visuelles ; la validation reste non bloquante pour le parcours.
   */
  submit(): void {
    this.store.dispatch(AuthActions.register({
      request: {
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
        email: this.email().trim(),
        password: this.password(),
        jobTitle: this.fn().trim() || undefined,
      },
    }));
  }
}
