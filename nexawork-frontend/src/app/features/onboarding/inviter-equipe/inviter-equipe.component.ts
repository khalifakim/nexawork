import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { WorkspaceLoaderService } from '@core/services/workspace-loader.service';
import { WorkspaceOnboardingState } from '@core/services/workspace-onboarding.state';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Étape 2 · Invitations initiales.
 *
 * Bouton "Retour" ajouté en tête : revient à l'étape 1 sans perte des infos
 * saisies (nom / slug / couleur ET emails / rôle sont mémorisés dans
 * `WorkspaceOnboardingState`).
 */
@Component({
  selector: 'app-inviter-equipe',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button class="nxf-back" (click)="back()"><app-icon name="chevronLeft" [size]="15" [stroke]="2.2" />Retour</button>
    <div class="nxf-steps">
      <span class="nxf-steps__label">Étape 2 sur 2</span>
      <div class="nxf-steps__bars">
        <div class="nxf-steps__bar nxf-steps__bar--on"></div>
        <div class="nxf-steps__bar nxf-steps__bar--on"></div>
      </div>
    </div>
    <h1 class="nxf-h1">Invitez votre équipe</h1>
    <p class="nxf-sub">Ajoutez les emails des premiers membres. Vous pourrez en inviter d'autres plus tard.</p>

    <div style="margin-bottom:14px">
      <label class="nxf-label">Inviter par email</label>
      <div style="display:flex;gap:10px">
        <input class="nxf-input" placeholder="nom@entreprise.com" [value]="draft"
               (input)="draft = $any($event.target).value" (keydown.enter)="add()" />
        <button class="addbtn" (click)="add()">Ajouter</button>
      </div>
    </div>

    <div class="tags">
      @for (e of state.emails(); track e; let i = $index) {
        <span class="tag">{{ e }}<button (click)="remove(i)"><app-icon name="x" [size]="14" [stroke]="2.4" /></button></span>
      }
    </div>

    <div style="margin-bottom:26px">
      <label class="nxf-label" style="margin-bottom:9px">Rôle d'accès des invités</label>
      <div style="display:flex;gap:8px">
        <button class="role" [class.role--on]="state.role()==='Membre'" (click)="state.role.set('Membre')">Membre</button>
        <button class="role" [class.role--on]="state.role()==='Administrateur'" (click)="state.role.set('Administrateur')">Administrateur</button>
      </div>
    </div>

    <button class="nxf-primary" (click)="finish()">Terminer et accéder à l'espace</button>
    <button class="nxf-muted-link" (click)="finish()">Passer cette étape</button>
  `,
  styles: [`
    .addbtn { flex: none; height: 44px; padding: 0 18px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn);
      background: #fff; color: var(--nx-text); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .addbtn:hover { background: var(--nx-surface-2); }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; min-height: 4px; }
    .tag { display: inline-flex; align-items: center; gap: 7px; background: var(--nx-indigo-50); color: var(--nx-indigo-text);
      font-size: 13px; font-weight: 600; padding: 6px 8px 6px 11px; border-radius: 8px; }
    .tag button { display: flex; background: none; border: none; color: #7E81F2; cursor: pointer; padding: 0; }
    .role { flex: 1; height: 42px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn);
      background: #fff; color: var(--nx-text-700); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .role--on { background: var(--nx-indigo); color: #fff; border-color: var(--nx-indigo); }
  `],
})
export class InviterEquipeComponent {
  private session = inject(SessionService);
  private loader  = inject(WorkspaceLoaderService);
  private router  = inject(Router);
  state = inject(WorkspaceOnboardingState);

  /** Champ de saisie non persisté — seul le tableau final est mémorisé. */
  draft = '';

  add(): void {
    const v = this.draft.trim();
    if (!v) return;
    this.state.emails.update(list => [...list, v]);
    this.draft = '';
  }
  remove(i: number): void { this.state.emails.update(list => list.filter((_, idx) => idx !== i)); }
  back(): void { this.router.navigate(['/auth/workspace/name']); }
  finish(): void {
    this.loader.show();
    this.session.enterWorkspace();
    this.state.reset();
  }
}
