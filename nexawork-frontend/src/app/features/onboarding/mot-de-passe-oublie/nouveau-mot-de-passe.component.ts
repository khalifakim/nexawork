import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';

/**
 * Étape finale du reset : nouveau mot de passe + confirmation.
 *
 * Atteint par le lien reçu par email (token en query côté back). Validations :
 *  - mot de passe ≥ 8 caractères,
 *  - confirmation identique.
 * Sur succès : toast + redirection vers `/auth/login`.
 */
@Component({
  selector: 'app-mdp-nouveau',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <button class="nxf-back" routerLink="/auth/login"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour à la connexion</button>
    <h1 class="nxf-h1">Nouveau mot de passe</h1>
    <p class="nxf-sub">Choisissez un nouveau mot de passe pour votre compte.</p>

    <div class="nxf-field">
      <label class="nxf-label">Nouveau mot de passe</label>
      <input class="nxf-input" [class.nxf-input--err]="showLenError()" type="password" placeholder="8 caractères minimum"
             [value]="pwd()" (input)="pwd.set($any($event.target).value)" />
      @if (showLenError()) {
        <div class="nxf-err">Le mot de passe doit contenir au moins 8 caractères.</div>
      }
    </div>

    <div class="nxf-field--last">
      <label class="nxf-label">Confirmer le mot de passe</label>
      <input class="nxf-input" [class.nxf-input--err]="showMismatch()" type="password" placeholder="Répétez le mot de passe"
             [value]="confirm()" (input)="confirm.set($any($event.target).value)"
             (keydown.enter)="submit()" />
      @if (showMismatch()) {
        <div class="nxf-err">Les deux mots de passe ne correspondent pas.</div>
      }
    </div>

    <button class="nxf-primary" [disabled]="!canSubmit()" (click)="submit()">Réinitialiser le mot de passe</button>
  `,
  styles: [`
    .nxf-input--err { border-color: var(--nx-danger); }
    .nxf-input--err:focus { box-shadow: 0 0 0 3px rgba(245,86,78,.14); }
    .nxf-err { font-size: 12px; color: var(--nx-danger); margin-top: 6px; }
    .nxf-primary:disabled { background: #C9C5BD; box-shadow: none; cursor: not-allowed; }
  `],
})
export class MdpNouveauComponent {
  private router = inject(Router);
  private toast  = inject(ToastService);

  pwd     = signal('');
  confirm = signal('');

  showLenError = computed(() => this.pwd().length > 0 && this.pwd().length < 8);
  showMismatch = computed(() => this.confirm().length > 0 && this.pwd() !== this.confirm());
  canSubmit    = computed(() => this.pwd().length >= 8 && this.pwd() === this.confirm());

  submit(): void {
    if (!this.canSubmit()) return;
    this.toast.show({ message: 'Mot de passe réinitialisé — connectez-vous.' });
    this.router.navigate(['/auth/login']);
  }
}
