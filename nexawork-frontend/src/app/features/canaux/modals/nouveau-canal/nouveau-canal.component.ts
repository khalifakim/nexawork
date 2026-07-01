import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-nouveau-canal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Nouveau canal" [subtitle]="scope === 'org' ? 'Canal organisation' : 'Canal · Refonte App Mobile'"
                     [width]="500" (closed)="closed.emit()">
      <label class="lbl">Nom du canal</label>
      <div class="namein">
        <span class="hash">#</span>
        <input autofocus placeholder="ex. lancement-produit" [value]="raw()" (input)="raw.set($any($event.target).value)" />
      </div>

      <div class="ro" [class.ro--on]="readonly()">
        <span class="ro__ic"><app-icon name="lock" [size]="16" /></span>
        <div class="ro__t">
          <div class="ro__title">Canal en lecture seule</div>
          <div class="ro__desc">{{ roDesc }}</div>
        </div>
        <button class="sw" [class.sw--on]="readonly()" (click)="readonly.set(!readonly())"><span class="knob"></span></button>
      </div>

      <div class="note"><app-icon name="info" [size]="14" /><span>{{ noteText }}</span></div>

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!name()" (click)="create()">Créer le canal</button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .lbl { display: block; font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--nx-text-400); margin-bottom: 7px; }
    .namein { display: flex; align-items: center; gap: 4px; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid #DDD9D1; margin-bottom: 18px; }
    .hash { font-size: 17px; font-weight: 700; color: var(--nx-text-300); }
    .namein input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 14px; color: var(--nx-text); }
    .ro { display: flex; align-items: flex-start; gap: 12px; padding: 13px 14px; border: 1px solid #E2DFD8; border-radius: 11px; background: var(--nx-surface-3); }
    .ro--on { background: rgba(91,95,233,.04); }
    .ro__ic { width: 32px; height: 32px; flex: none; border-radius: 8px; background: #fff; border: 1px solid #ECEAE4; color: #7a7682; display: flex; align-items: center; justify-content: center; }
    .ro__t { flex: 1; min-width: 0; }
    .ro__title { font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .ro__desc { font-size: 12px; color: var(--nx-text-500); margin-top: 2px; line-height: 1.45; }
    .sw { width: 42px; height: 24px; flex: none; border-radius: 13px; border: none; background: #cfccc4; cursor: pointer; position: relative; padding: 0; }
    .sw--on { background: var(--nx-indigo); }
    .knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
    .sw--on .knob { left: 21px; }
    .note { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 12px; color: var(--nx-text-400); }
    .ghost { height: 38px; padding: 0 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary { height: 38px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary:disabled { background: #cfccc4; cursor: not-allowed; }
  `],
})
export class NouveauCanalComponent {
  @Input() scope: 'org' | 'project' = 'org';
  @Output() closed = new EventEmitter<void>();
  private router = inject(Router);
  raw = signal('');
  readonly = signal(false);
  name = computed(() => this.raw().trim().replace(/^#+/, '').replace(/\s+/g, '-'));

  get roDesc(): string {
    return this.scope === 'org'
      ? 'Seuls les administrateurs peuvent écrire. Les autres membres peuvent uniquement lire. Idéal pour les annonces officielles.'
      : 'Seuls les administrateurs et le chef de projet peuvent écrire. Les autres membres peuvent uniquement lire.';
  }
  get noteText(): string {
    return this.scope === 'org'
      ? "La création de canaux d'organisation est réservée aux administrateurs."
      : 'La création de canaux de projet est réservée aux administrateurs et au chef de projet.';
  }

  create(): void {
    const n = this.name();
    if (!n) return;
    this.closed.emit();
    this.router.navigate(['/app/canaux', n]);
  }
}
