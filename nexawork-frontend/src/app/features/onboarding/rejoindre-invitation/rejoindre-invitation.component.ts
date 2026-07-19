import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { SessionService } from '@core/services/session.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { AuthActions } from '@store/auth/auth.actions';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Acceptation d'invitation (§3.2) — atteint via le lien email (`/auth/invite?token=`).
 *
 * Deux parcours selon l'existence d'un compte pour l'email invité :
 * - **nouveau compte** : formulaire d'inscription (nom, mot de passe…) puis
 *   `POST /invitations/{token}/accept` ;
 * - **compte existant** : aucune re-saisie de profil — connexion préalable en
 *   ligne (si non déjà connecté), puis `POST /invitations/{token}/join`.
 *
 * Layout compact intentionnel — objectif : visible d'un seul écran, pas de scroll.
 */
@Component({
  selector: 'app-rejoindre-invitation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (loadingContext()) {
      <!-- Chargement du contexte (nom de l'invitant, workspace, rôle) : sans loader,
           l'écran restait figé sur des « … », donnant l'impression d'un blocage. -->
      <div class="loadstate">
        <span class="loadstate__spin"></span>
        <p>Chargement de l'invitation…</p>
      </div>
    } @else if (loadError()) {
      <div class="loadstate">
        <app-icon name="warning" [size]="30" />
        <p>Ce lien d'invitation n'est plus valide.</p>
      </div>
    } @else {
    <span class="tag">Invitation</span>
    <div class="card">
      <div class="card__av">{{ inviterInitials() }}</div>
      <div class="card__b">
        <div class="card__by"><span class="card__bn">{{ inviterName() }}</span> vous invite à rejoindre</div>
        <div class="card__ws">
          <div class="ws" [style.background]="workspaceColor()">{{ workspaceMono() }}</div>
          <span class="ws__n">{{ workspaceName() }}</span>
          <span class="ws__c">· {{ memberCount() }} membres</span>
        </div>
      </div>
    </div>

    <div class="role-line">
      <app-icon name="lock" [size]="14" [stroke]="2" />
      Vous rejoindrez en tant que <span class="role-badge">{{ roleLabel() }}</span>
    </div>

    @switch (mode()) {

      <!-- Compte existant, session déjà ouverte pour cet email : un seul clic. -->
      @case ('oneclick') {
        <div class="note">
          <app-icon name="check" [size]="14" [stroke]="2" />
          Vous êtes connecté en tant que <b>{{ email() }}</b>.
        </div>
        <button class="submit" [disabled]="busy()" (click)="join()">
          {{ busy() ? "Ajout en cours…" : "Rejoindre l'espace" }}
        </button>
      }

      <!-- Compte existant, non connecté : connexion préalable en ligne (sans re-saisie de profil). -->
      @case ('login') {
        <div class="note">
          <app-icon name="info" [size]="14" [stroke]="2" />
          Un compte existe déjà pour <b>{{ email() }}</b>. Saisissez votre mot de passe pour rejoindre l'espace.
        </div>
        <div class="f f--last">
          <label class="l">Mot de passe</label>
          <input class="i" type="password" placeholder="Votre mot de passe"
                 [value]="password()" (input)="password.set($any($event.target).value)"
                 (keyup.enter)="join()" />
        </div>
        @if (loginError()) {
          <div class="err">{{ loginError() }}</div>
        }
        <button class="submit" [disabled]="!password() || busy()" (click)="join()">
          {{ busy() ? "Connexion…" : "Rejoindre l'espace" }}
        </button>
      }

      <!-- Nouveau compte : formulaire d'inscription complet. -->
      @default {
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
            <input class="i" [class.i--err]="passwordTooShort()" type="password" placeholder="8 caractères min."
                   [value]="password()" (input)="password.set($any($event.target).value)" />
          </div>
          <div class="f"><label class="l">Confirmation</label>
            <input class="i" [class.i--err]="passwordMismatch()" type="password" placeholder="Répétez"
                   [value]="confirm()" (input)="confirm.set($any($event.target).value)" />
          </div>
        </div>
        @if (passwordTooShort()) {
          <div class="err">Le mot de passe doit contenir au moins 8 caractères.</div>
        }
        @if (passwordMismatch()) {
          <div class="err">Les deux mots de passe ne correspondent pas.</div>
        }

        <div class="f f--last">
          <label class="l">Fonction</label>
          <input class="i" placeholder="Designer, Développeur, Chef de produit…"
                 [value]="role()" (input)="role.set($any($event.target).value)" />
        </div>

        <button class="submit" [disabled]="!canSubmit() || busy()" (click)="submit()">Rejoindre l'espace</button>
      }
    }
    }
  `,
  styles: [`
    :host { display: block; }
    .tag { font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--nx-indigo); }
    .loadstate { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px 16px; text-align: center; color: var(--nx-text-500); }
    .loadstate p { margin: 0; font-size: 13px; }
    .loadstate__spin { width: 30px; height: 30px; border: 3px solid var(--nx-surface-3); border-top-color: var(--nx-indigo); border-radius: 50%; animation: invSpin .8s linear infinite; }
    @keyframes invSpin { to { transform: rotate(360deg); } }

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
    .note { display: flex; align-items: center; gap: 7px; margin: 2px 0 12px; padding: 9px 12px; border-radius: 9px; background: var(--nx-surface-2); font-size: 12.5px; color: var(--nx-text-600); line-height: 1.4; }

    .submit { width: 100%; height: 40px; border: none; border-radius: 8px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 16px rgba(91,95,233,.28); }
    .submit:disabled { background: #C9C5BD; box-shadow: none; cursor: not-allowed; }
  `],
})
export class RejoindreInvitationComponent implements OnInit {
  private session = inject(SessionService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  /** Token d'invitation porté par le lien email (`/auth/invite?token=…`). */
  private token = this.route.snapshot.queryParamMap.get('token') ?? '';

  firstName = signal('');
  lastName  = signal('');
  email     = signal('');
  password  = signal('');
  confirm   = signal('');
  role      = signal('');

  /** Requête en cours (désactive les boutons). */
  busy = signal(false);
  /** Erreur de connexion (parcours compte existant). */
  loginError = signal<string | null>(null);
  /** Vrai si un compte existe déjà pour l'email invité. */
  private accountExists = signal(false);

  // Contexte du bandeau (chargé depuis GET /invitations/{token}).
  inviterName    = signal('…');
  workspaceName  = signal('…');
  workspaceColor = signal('#6C70F0');
  memberCount    = signal(0);
  private roleCode = signal<'ADMIN' | 'MEMBER'>('MEMBER');

  /** Chargement du contexte de l'invitation (bandeau) — loader tant qu'il n'est pas prêt. */
  loadingContext = signal(true);
  loadError = signal(false);

  inviterInitials = computed(() => this.inviterName().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?');
  workspaceMono = computed(() => (this.workspaceName().trim()[0] ?? 'N').toUpperCase());
  roleLabel = computed(() => this.roleCode() === 'ADMIN' ? 'Administrateur' : 'Membre');

  /**
   * Parcours affiché : `signup` (nouveau compte), `login` (compte existant, non
   * connecté → mot de passe), `oneclick` (déjà connecté sur cet email).
   */
  mode = computed<'signup' | 'login' | 'oneclick'>(() => {
    if (!this.accountExists()) return 'signup';
    const current = this.session.user()?.email;
    return current && current.toLowerCase() === this.email().toLowerCase() ? 'oneclick' : 'login';
  });

  ngOnInit(): void {
    if (!this.token) { this.loadingContext.set(false); this.loadError.set(true); return; }
    this.auth.getInvitation(this.token).subscribe({
      next: ctx => {
        this.inviterName.set(ctx.inviterDisplayName);
        this.workspaceName.set(ctx.workspaceName);
        this.workspaceColor.set(ctx.workspaceColor);
        this.memberCount.set(ctx.memberCount);
        this.roleCode.set(ctx.role);
        this.email.set(ctx.email); // email invité pré-rempli
        this.accountExists.set(!!ctx.accountExists);
        this.loadingContext.set(false);
      },
      error: () => { this.loadingContext.set(false); this.loadError.set(true); },
    });
  }

  /** Mot de passe saisi mais trop court (règle unique : ≥ 8 caractères). */
  passwordTooShort = computed(() => {
    const p = this.password();
    return p.length > 0 && p.length < 8;
  });

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

  /** Nouveau compte : création + adhésion (§3.2), session scellée → entrée directe. */
  submit(): void {
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.auth.acceptInvitation(this.token, {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      email: this.email().trim(),
      password: this.password(),
      jobTitle: this.role().trim() || undefined,
    }).subscribe({
      next: response => this.enter(response),
      error: () => this.busy.set(false),
    });
  }

  /**
   * Compte existant : rejoint l'espace. En mode `login`, on authentifie d'abord
   * en ligne (le token doit être en session pour que `join` porte le Bearer),
   * puis on rejoint. En mode `oneclick`, on rejoint directement.
   */
  join(): void {
    if (this.busy()) return;
    this.loginError.set(null);
    this.busy.set(true);

    if (this.mode() === 'oneclick') {
      this.doJoin();
      return;
    }

    this.auth.login({ email: this.email().trim(), password: this.password() }).subscribe({
      next: session => {
        // Peuple le token en session (sans navigation) pour que `join` soit authentifié.
        this.store.dispatch(AuthActions.refreshTokenSuccess({ response: session }));
        this.doJoin();
      },
      error: () => {
        this.busy.set(false);
        this.loginError.set('Mot de passe incorrect.');
      },
    });
  }

  private doJoin(): void {
    this.auth.joinInvitation(this.token).subscribe({
      next: response => this.enter(response),
      error: () => this.busy.set(false),
    });
  }

  private enter(response: import('@core/models/auth.models').AuthResponse): void {
    this.session.establishSession(response);
    this.toast.show({ message: 'Bienvenue sur ' + this.workspaceName() + ' !' });
  }
}
