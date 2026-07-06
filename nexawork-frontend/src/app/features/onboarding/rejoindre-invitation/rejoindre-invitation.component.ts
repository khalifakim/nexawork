import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { DEFAULT_WORKSPACE_ID } from '@core/mock/workspaces';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Formulaire d'acceptation d'invitation.
 *
 * Ce composant est atteint uniquement en cliquant sur le lien reçu par email
 * (route `/auth/invite`, un token portera bientôt les infos d'invitation côté
 * back). Après validation du formulaire l'utilisateur rejoint directement le
 * workspace ; ses identifiants de connexion futurs seront email + mot de passe
 * définis ici.
 *
 * Layout compact intentionnel — objectif : formulaire visible d'un seul écran,
 * pas de scroll vertical.
 */
@Component({
  selector: 'app-rejoindre-invitation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span class="tag">Invitation</span>
    <div class="card">
      <div class="card__av">SD</div>
      <div class="card__b">
        <div class="card__by"><span class="card__bn">Sarah Diallo</span> vous invite à rejoindre</div>
        <div class="card__ws">
          <div class="ws">N</div>
          <span class="ws__n">Atelier Nexa</span>
          <span class="ws__c">· 12 membres</span>
        </div>
      </div>
    </div>

    <div class="role-line">
      <app-icon name="lock" [size]="14" [stroke]="2" />
      Vous rejoindrez en tant que <span class="role-badge">Membre</span>
    </div>

    <div class="row">
      <div class="f"><label class="l">Prénom</label><input class="i" placeholder="Prénom" [value]="firstName()" (input)="firstName.set($any($event.target).value)" /></div>
      <div class="f"><label class="l">Nom</label><input class="i" placeholder="Nom" [value]="lastName()" (input)="lastName.set($any($event.target).value)" /></div>
    </div>

    <div class="f">
      <label class="l">Adresse email</label>
      <input class="i" type="email" placeholder="vous@entreprise.com"
             [value]="email()" (input)="email.set($any($event.target).value)" />
    </div>

    <div class="row">
      <div class="f"><label class="l">Mot de passe</label>
        <input class="i" type="password" placeholder="8 caractères min."
               [value]="password()" (input)="password.set($any($event.target).value)" />
      </div>
      <div class="f"><label class="l">Confirmation</label>
        <input class="i" [class.i--err]="passwordMismatch()" type="password" placeholder="Répétez"
               [value]="confirm()" (input)="confirm.set($any($event.target).value)" />
      </div>
    </div>
    @if (passwordMismatch()) {
      <div class="err">Les deux mots de passe ne correspondent pas.</div>
    }

    <div class="f f--last">
      <label class="l">Fonction</label>
      <input class="i" placeholder="Designer, Développeur, Chef de produit…"
             [value]="role()" (input)="role.set($any($event.target).value)" />
    </div>

    <button class="submit" (click)="submit()">Rejoindre l'espace</button>
  `,
  styles: [`
    :host { display: block; }
    .tag { font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--nx-indigo); }

    .card { display: flex; align-items: center; gap: 10px; margin: 8px 0 10px; padding: 10px 12px; border: 1px solid var(--nx-border); border-radius: 10px; background: #fff; }
    .card__av { width: 34px; height: 34px; flex: none; border-radius: 50%; background: linear-gradient(135deg,#F5A623,#F2693C); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .card__b  { min-width: 0; }
    .card__by { font-size: 12.5px; color: var(--nx-text-700); line-height: 1.35; }
    .card__bn { color: var(--nx-text); font-weight: 700; }
    .card__ws { display: flex; align-items: center; gap: 7px; margin-top: 5px; }
    .ws { width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg,#6C70F0,#4B3FD6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
    .ws__n { font-size: 13px; font-weight: 600; }
    .ws__c { font-size: 11.5px; color: var(--nx-text-500); }

    .role-line { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; font-size: 12px; color: var(--nx-text-500); }
    .role-badge { color: var(--nx-indigo-text); font-weight: 600; background: var(--nx-indigo-50); padding: 1px 8px; border-radius: 999px; font-size: 11.5px; }

    .row { display: flex; gap: 8px; }
    .f { flex: 1; margin-bottom: 8px; }
    .f--last { margin-bottom: 12px; }
    .l { display: block; font-size: 11.5px; font-weight: 600; color: var(--nx-text-700); margin-bottom: 3px; }
    .i { width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--nx-border); background: #fff; font-family: inherit; font-size: 13px; color: var(--nx-text); outline: none; box-sizing: border-box; }
    .i:focus { border-color: var(--nx-indigo); box-shadow: 0 0 0 2.5px rgba(91,95,233,.14); }
    .i--err { border-color: var(--nx-danger); }
    .i--err:focus { box-shadow: 0 0 0 2.5px rgba(245,86,78,.14); }
    .err { font-size: 11.5px; color: var(--nx-danger); margin: -4px 0 8px; }

    .submit { width: 100%; height: 40px; border: none; border-radius: 8px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 16px rgba(91,95,233,.28); }
    .submit:disabled { background: #C9C5BD; box-shadow: none; cursor: not-allowed; }
  `],
})
export class RejoindreInvitationComponent {
  private session = inject(SessionService);
  private toast = inject(ToastService);
  private router = inject(Router);

  firstName = signal('');
  lastName  = signal('');
  email     = signal('');
  password  = signal('');
  confirm   = signal('');
  role      = signal('');

  /** Vrai si l'utilisateur a saisi une confirmation qui diffère du mot de passe. */
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
   * Après validation, l'utilisateur rejoint directement le workspace ciblé.
   * Simulation frontend : soumission ouverte, les erreurs inline restent
   * pour guider la saisie mais ne bloquent pas la navigation.
   */
  submit(): void {
    // Acceptation d'invitation (branchement backend réel = Lot I1c) : charge les
    // espaces et entre dans le premier disponible.
    this.session.loadWorkspaces();
    this.session.enterWorkspace(DEFAULT_WORKSPACE_ID);
    this.toast.show({ message: 'Bienvenue sur votre espace !' });
  }
}
