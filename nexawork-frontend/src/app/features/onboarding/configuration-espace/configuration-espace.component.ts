import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceOnboardingState } from '@core/services/workspace-onboarding.state';

/**
 * Étape 1 · Création du premier workspace.
 *
 * L'état (nom, slug, couleur) vit dans `WorkspaceOnboardingState`, ce qui
 * permet à l'étape 2 (« Inviter votre équipe ») de revenir ici sans perdre
 * les informations déjà saisies.
 */
@Component({
  selector: 'app-configuration-espace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nxf-steps">
      <span class="nxf-steps__label">Étape 1 sur 2</span>
      <div class="nxf-steps__bars">
        <div class="nxf-steps__bar nxf-steps__bar--on"></div>
        <div class="nxf-steps__bar"></div>
      </div>
    </div>
    <h1 class="nxf-h1">Créez votre espace de travail</h1>
    <p class="nxf-sub">Donnez un nom à votre espace. L'icône et l'identifiant sont générés automatiquement.</p>

    <div class="nxf-field">
      <label class="nxf-label">Nom de l'espace</label>
      <input class="nxf-input" placeholder="Atelier Nexa" [value]="state.name()" (input)="onName($any($event.target).value)" />
    </div>

    <div class="preview">
      <div class="preview__logo" [style.background]="state.color()">{{ monogram() }}</div>
      <div style="min-width:0">
        <div class="preview__name">{{ state.name() || 'Votre espace' }}</div>
        <div class="preview__slug">nexawork.app/{{ state.slug() || 'mon-espace' }}</div>
      </div>
    </div>

    <div class="nxf-field">
      <label class="nxf-label">Couleur de l'icône</label>
      <div class="palette">
        @for (c of palette; track c) {
          <button class="swatch" [class.swatch--on]="state.color() === c" [style.background]="c"
                  [style.box-shadow]="state.color() === c ? '0 0 0 2.5px #fff, 0 0 0 4.5px ' + c : 'none'"
                  (click)="state.color.set(c)" [attr.aria-label]="'Couleur ' + c"></button>
        }
      </div>
    </div>

    <div class="nxf-field--last">
      <label class="nxf-label">Identifiant de l'espace (URL)</label>
      <div class="slug">
        <span>nexawork.app/</span>
        <input [value]="state.slug()" (input)="onSlug($any($event.target).value)" placeholder="mon-espace" />
      </div>
    </div>

    <button class="nxf-primary" (click)="next()">Continuer</button>
  `,
  styles: [`
    .preview { display: flex; align-items: center; gap: 13px; padding: 13px; border: 1px solid var(--nx-border);
      border-radius: 12px; background: #fff; margin-bottom: 14px; }
    .preview__logo { width: 46px; height: 46px; flex: none; border-radius: 12px;
      color: #fff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 700; transition: background .15s; }
    .palette { display: flex; gap: 10px; flex-wrap: wrap; }
    .swatch { width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; padding: 0; transition: box-shadow .12s; }
    .swatch:hover { transform: scale(1.08); }
    .preview__name { font-size: 14.5px; font-weight: 600; }
    .preview__slug { font-size: 12px; color: var(--nx-text-500); font-family: var(--nx-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slug { display: flex; align-items: center; height: 44px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; overflow: hidden; }
    .slug span { padding: 0 2px 0 14px; color: var(--nx-text-500); font-size: 13.5px; font-family: var(--nx-mono); white-space: nowrap; }
    .slug input { flex: 1; min-width: 0; border: none; outline: none; height: 100%; font-family: var(--nx-mono); font-size: 13.5px; color: var(--nx-text); background: transparent; padding: 0 12px 0 0; }
  `],
})
export class ConfigurationEspaceComponent {
  state = inject(WorkspaceOnboardingState);
  private router = inject(Router);

  /** Palette identique à celle du prototype. */
  readonly palette = ['#6C70F0', '#5B8DEF', '#2BB673', '#F5A623', '#F2693C', '#F5564E', '#E0497B', '#3AA9E0', '#8E5AD6', '#8E8AA0'];

  monogram(): string {
    const n = this.state.name().trim();
    return n ? n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'N';
  }

  private slugify(v: string): string {
    return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  onName(v: string): void {
    this.state.name.set(v);
    if (!this.state.slugTouched()) this.state.slug.set(this.slugify(v));
  }
  onSlug(v: string): void { this.state.slug.set(this.slugify(v)); this.state.slugTouched.set(true); }
  next(): void { this.router.navigate(['/auth/workspace/invite']); }
}
