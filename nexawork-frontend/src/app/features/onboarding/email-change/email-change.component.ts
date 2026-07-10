import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { AuthActions } from '@store/auth/auth.actions';

/**
 * Confirmation d'un changement d'adresse email (§13.1). Le lien reçu à la
 * nouvelle adresse ouvre cette page : on confirme le changement, toutes les
 * sessions sont invalidées côté serveur, puis on force la déconnexion locale et
 * la redirection vers la connexion (l'utilisateur se ré-authentifie avec sa
 * nouvelle adresse).
 */
@Component({
  selector: 'app-email-change',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @if (state() === 'confirming') {
      <div class="nxf-circle" style="background:var(--nx-indigo-50);color:var(--nx-indigo)">
        <app-icon name="mail" [size]="27" />
      </div>
      <h1 class="nxf-h1">Confirmation en cours…</h1>
      <p class="nxf-sub">Nous validons votre nouvelle adresse email, un instant.</p>
    } @else {
      <div class="nxf-circle" style="background:var(--nx-danger-50,#FDECEC);color:var(--nx-danger)">
        <app-icon name="alert" [size]="27" />
      </div>
      <h1 class="nxf-h1">Lien invalide ou expiré</h1>
      <p class="nxf-sub">Ce lien de confirmation n'est plus valide. Vous pouvez relancer le changement depuis Paramètres ▸ Sécurité.</p>
      <button class="nxf-primary" routerLink="/auth/login">Aller à la connexion</button>
    }
  `,
  styles: [``],
})
export class EmailChangeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  /** `confirming` pendant la consommation du token, `error` en cas d'échec. */
  state = signal<'confirming' | 'error'>('confirming');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.state.set('error'); return; }

    this.auth.confirmEmailChange(token).subscribe({
      next: () => {
        this.toast.show({ message: 'Adresse email modifiée. Reconnectez-vous avec votre nouvelle adresse.' });
        // Purge la session locale (l'ancien token est révoqué) puis redirige
        // vers la connexion — postérieure à la navigation « landing » du logout.
        this.store.dispatch(AuthActions.logout());
        this.router.navigate(['/auth/login']);
      },
      error: () => this.state.set('error'),
    });
  }
}
