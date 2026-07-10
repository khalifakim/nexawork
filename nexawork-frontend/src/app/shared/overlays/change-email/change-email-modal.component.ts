import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * « Modifier l'adresse email » — modal du design-system remplaçant la boîte
 * native `window.prompt` (§15.1). Émet la nouvelle adresse ; un lien de
 * confirmation est ensuite envoyé par le composant appelant.
 */
@Component({
  selector: 'app-change-email-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <div class="hd">
          <div class="hd__ic"><app-icon name="mail" [size]="19" /></div>
          <div class="hd__t">
            <div class="hd__title">Modifier l'adresse email</div>
            <div class="hd__sub">Un lien de confirmation sera envoyé à la nouvelle adresse</div>
          </div>
          <button class="x" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
        </div>

        <div class="bd">
          <label class="lbl">Nouvelle adresse email</label>
          <input class="in" type="email" [class.in--ok]="valid()"
                 [value]="email()" (input)="email.set($any($event.target).value)"
                 (keydown.enter)="submit()"
                 placeholder="vous@entreprise.com" autofocus />
          @if (email().length > 0 && !valid()) {
            <div class="err">Adresse email invalide.</div>
          }
          <div class="note">
            <app-icon name="info" [size]="14" />
            À la confirmation, vos sessions seront fermées : vous devrez vous reconnecter avec cette nouvelle adresse.
          </div>
        </div>

        <div class="ft">
          <button class="ghost" (click)="closed.emit()">Annuler</button>
          <button class="primary" [disabled]="!valid()" (click)="submit()">Envoyer le lien</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 110; background: rgba(22,19,31,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 40px; animation: nxFade .18s ease; }
    .card { width: 460px; max-width: 94vw; background: #fff; border-radius: 20px; box-shadow: 0 28px 80px rgba(20,15,40,.4); overflow: hidden; animation: nxFadeIn .2s ease; }
    .hd { display: flex; align-items: center; padding: 24px 28px 18px; gap: 14px; }
    .hd__ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--nx-indigo-50); color: var(--nx-indigo); flex: none; }
    .hd__t { flex: 1; min-width: 0; }
    .hd__title { font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
    .hd__sub { font-size: 13px; color: var(--nx-text-500); margin-top: 2px; }
    .x { width: 32px; height: 32px; border: none; border-radius: 9px; background: transparent; color: var(--nx-text-500); cursor: pointer; display: flex; align-items: center; justify-content: center; flex: none; }
    .x:hover { background: var(--nx-surface-2); }

    .bd { padding: 0 28px 24px; }
    .lbl { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--nx-text-500); margin-bottom: 7px; }
    .in { width: 100%; box-sizing: border-box; height: 46px; padding: 0 16px; border: 1.5px solid #DDD9D1; border-radius: 12px; outline: none; font-family: inherit; font-size: 15px; font-weight: 500; color: var(--nx-text); transition: border .15s; }
    .in--ok { border-color: var(--nx-indigo); }
    .err { font-size: 12px; color: var(--nx-danger); margin-top: 6px; }
    .note { display: flex; gap: 8px; margin-top: 16px; padding: 10px 12px; border-radius: 10px; background: var(--nx-surface-2); font-size: 12.5px; color: var(--nx-text-600); line-height: 1.45; }

    .ft { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 28px 22px; border-top: 1px solid var(--nx-border-card); }
    .ghost { height: 42px; padding: 0 20px; border: 1px solid #DDD9D1; border-radius: 11px; background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .ghost:hover { background: var(--nx-surface-2); }
    .primary { height: 42px; padding: 0 24px; border: none; border-radius: 11px; background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(91,95,233,.28); }
    .primary:disabled { background: #cfcbc2; cursor: not-allowed; box-shadow: none; }

    @keyframes nxFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes nxFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class ChangeEmailModalComponent {
  /** Émet la nouvelle adresse validée. */
  @Output() confirmed = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  email = signal('');
  valid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim()));

  submit(): void {
    if (!this.valid()) return;
    this.confirmed.emit(this.email().trim());
  }
}
