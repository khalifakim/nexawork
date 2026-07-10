import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { SessionService } from '@core/services/session.service';

/**
 * Écran "Vérifiez votre boîte mail" après création de compte. L'utilisateur
 * clique sur le lien reçu par email (`/auth/verify?token=…`) : l'adresse est
 * confirmée, la session établie, puis redirection selon le contexte (§3.5).
 */
@Component({
  selector: 'app-verification-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @if (confirming()) {
      <!-- Le lien de l'email a été cliqué : on confirme l'adresse. -->
      <div class="nxf-circle" style="background:var(--nx-indigo-50);color:var(--nx-indigo)">
        <app-icon name="mail" [size]="27" />
      </div>
      <h1 class="nxf-h1">Confirmation en cours…</h1>
      <p class="nxf-sub">Nous validons votre adresse email, un instant.</p>
    } @else {
      <button class="nxf-back" routerLink="/auth/signup"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour</button>
      <div class="nxf-circle" style="background:var(--nx-indigo-50);color:var(--nx-indigo)">
        <app-icon name="mail" [size]="27" />
      </div>
      <h1 class="nxf-h1">Vérifiez votre boîte mail</h1>
      <p class="nxf-sub">Nous avons envoyé un lien de confirmation à <span style="color:var(--nx-text);font-weight:600">votre adresse email</span>. Cliquez dessus pour activer votre compte.</p>
      <button class="nxf-muted-link" (click)="resend()">Renvoyer l'email</button>
    }
  `,
  styles: [``],
})
export class VerificationEmailComponent implements OnInit {
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private session = inject(SessionService);
  private route = inject(ActivatedRoute);

  /** Vrai pendant la consommation du token (lien email cliqué). */
  confirming = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return; // écran d'attente « vérifiez votre boîte mail »

    this.confirming.set(true);
    this.auth.verifyEmail(token).subscribe({
      next: response => {
        // Session établie → enchaîne sur la création du 1ᵉʳ workspace (fondateur)
        // ou l'entrée dans l'espace (§3.5).
        this.toast.show({ message: 'Adresse email confirmée.' });
        this.session.establishSessionAfterVerification(response);
      },
      error: () => {
        this.confirming.set(false);
        this.toast.show({ message: 'Lien de confirmation invalide ou expiré.', icon: 'warning' });
      },
    });
  }

  resend(): void {
    this.toast.show({ message: 'Nouvel email de confirmation envoyé.' });
  }
}
