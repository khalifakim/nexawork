import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';

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
    <p class="nxf-sub">Donnez un nom à votre espace. Le logo et l'identifiant sont générés automatiquement.</p>

    <div class="nxf-field">
      <label class="nxf-label">Nom de l'espace</label>
      <input class="nxf-input" placeholder="Atelier Nexa" [value]="name()" (input)="onName($any($event.target).value)" />
    </div>

    <div class="preview">
      <div class="preview__logo">{{ monogram() }}</div>
      <div style="min-width:0">
        <div class="preview__name">{{ name() || 'Votre espace' }}</div>
        <div class="preview__slug">nexawork.app/{{ slug() || 'mon-espace' }}</div>
      </div>
    </div>

    <div class="nxf-field--last">
      <label class="nxf-label">Identifiant de l'espace (URL)</label>
      <div class="slug">
        <span>nexawork.app/</span>
        <input [value]="slug()" (input)="onSlug($any($event.target).value)" placeholder="mon-espace" />
      </div>
    </div>

    <button class="nxf-primary" (click)="next()">Continuer</button>
  `,
  styles: [`
    .preview { display: flex; align-items: center; gap: 13px; padding: 13px; border: 1px solid var(--nx-border);
      border-radius: 12px; background: #fff; margin-bottom: 18px; }
    .preview__logo { width: 46px; height: 46px; flex: none; border-radius: 12px;
      background: linear-gradient(135deg,#6C70F0,#4B3FD6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 700; }
    .preview__name { font-size: 14.5px; font-weight: 600; }
    .preview__slug { font-size: 12px; color: var(--nx-text-500); font-family: var(--nx-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slug { display: flex; align-items: center; height: 44px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; overflow: hidden; }
    .slug span { padding: 0 2px 0 14px; color: var(--nx-text-500); font-size: 13.5px; font-family: var(--nx-mono); white-space: nowrap; }
    .slug input { flex: 1; min-width: 0; border: none; outline: none; height: 100%; font-family: var(--nx-mono); font-size: 13.5px; color: var(--nx-text); background: transparent; padding: 0 12px 0 0; }
  `],
})
export class ConfigurationEspaceComponent {
  name = signal('');
  slug = signal('');
  private slugTouched = false;

  constructor(private router: Router) {}

  monogram(): string {
    const n = this.name().trim();
    return n ? n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'N';
  }

  private slugify(v: string): string {
    return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  onName(v: string): void {
    this.name.set(v);
    if (!this.slugTouched) this.slug.set(this.slugify(v));
  }
  onSlug(v: string): void { this.slug.set(this.slugify(v)); this.slugTouched = true; }
  next(): void { this.router.navigate(['/auth/workspace/invite']); }
}
