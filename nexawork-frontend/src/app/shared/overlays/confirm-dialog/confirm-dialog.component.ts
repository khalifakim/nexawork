import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Reusable confirmation dialog — the single source of truth for every
 * "archive / delete / restore" style confirmation across the app.
 *
 * Two visual variants:
 *  - `danger` (default): red accent, for destructive actions (delete).
 *  - non-danger: indigo accent, for safe actions (archive, restore).
 *
 *   <app-confirm-dialog
 *     [danger]="true" title="Supprimer le projet" [subtitle]="name"
 *     icon="trash" confirmLabel="Supprimer définitivement" [lines]="[...]"
 *     (confirmed)="doDelete()" (closed)="open.set(false)" />
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__bd">
          <div class="modal__top">
            <span class="modal__i" [class.modal__i--safe]="!danger"><app-icon [name]="icon" [size]="22" /></span>
            <div class="modal__ht">
              <div class="modal__title">{{ title }}</div>
              @if (subtitle) { <div class="modal__sub">{{ subtitle }}</div> }
            </div>
          </div>
          @if (lines.length) {
            <div class="modal__lines">
              @for (l of lines; track $index) {
                <div class="modal__line"><span class="modal__dot" [class.modal__dot--safe]="!danger"></span><span>{{ l }}</span></div>
              }
            </div>
          }
        </div>
        <div class="modal__ft">
          <button class="modal__cancel" (click)="closed.emit()">{{ cancelLabel }}</button>
          <button class="modal__confirm" [class.modal__confirm--safe]="!danger" (click)="confirmed.emit()">
            <app-icon [name]="icon" [size]="16" />{{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov { position: fixed; inset: 0; z-index: 200; background: rgba(22,19,31,.5); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 40px; }
    .modal { width: 460px; max-width: 94vw; background: #fff; border-radius: 16px; box-shadow: 0 24px 70px rgba(20,15,40,.4); overflow: hidden; animation: nxFadeIn .18s ease; }
    .modal__bd { padding: 24px 24px 18px; }
    .modal__top { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
    .modal__i { width: 44px; height: 44px; flex: none; border-radius: 12px; background: rgba(245,86,78,.10); color: var(--nx-danger); display: flex; align-items: center; justify-content: center; }
    .modal__i--safe { background: rgba(91,95,233,.10); color: var(--nx-indigo); }
    .modal__ht { min-width: 0; }
    .modal__title { font-size: 17px; font-weight: 700; color: var(--nx-text); }
    .modal__sub { font-size: 13px; color: var(--nx-text-500); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .modal__lines { display: flex; flex-direction: column; gap: 8px; }
    .modal__line { display: flex; gap: 9px; align-items: flex-start; font-size: 13px; color: var(--nx-text-700); line-height: 1.5; }
    .modal__dot { width: 5px; height: 5px; border-radius: 50%; background: var(--nx-danger); flex: none; margin-top: 7px; }
    .modal__dot--safe { background: var(--nx-indigo); }
    .modal__ft { display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 22px; }
    .modal__cancel { height: 40px; padding: 0 18px; border: 1px solid #D9D6CE; border-radius: 9px; background: #fff; color: var(--nx-text-700); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .modal__cancel:hover { background: var(--nx-surface-2); }
    .modal__confirm { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border: none; border-radius: 9px; background: var(--nx-danger); color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(245,86,78,.3); }
    .modal__confirm--safe { background: var(--nx-indigo); box-shadow: 0 6px 18px rgba(91,95,233,.3); }
    @keyframes nxFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class ConfirmDialogComponent {
  /** Red destructive variant (default) vs. indigo safe variant. */
  @Input() danger = true;
  @Input() title = '';
  @Input() subtitle = '';
  /** Icon glyph name (e.g. 'trash', 'archive', 'restore'). */
  @Input() icon = 'trash';
  @Input() confirmLabel = 'Confirmer';
  @Input() cancelLabel = 'Annuler';
  @Input() lines: string[] = [];

  @Output() confirmed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}
