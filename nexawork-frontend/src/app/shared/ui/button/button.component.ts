import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'dashed' | 'danger';

/**
 * Design-system button. One primary (indigo) per screen — use `secondary`,
 * `ghost`, `outline` (accent, for admin/lead actions) or `dashed` (add) for the
 * rest. Height 40px (36 for `sm`).
 */
@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button class="btn" [class]="'btn--' + variant" [class.btn--sm]="size === 'sm'"
            [class.btn--block]="full" [class.btn--icon]="iconOnly"
            [disabled]="disabled" [attr.type]="type">
      @if (icon) { <app-icon [name]="icon" [size]="iconSize" /> }
      @if (!iconOnly) { <span><ng-content></ng-content></span> }
    </button>
  `,
  styles: [`
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
           height: 40px; padding: 0 16px; border-radius: var(--nx-r-btn); border: 1px solid transparent;
           font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
           transition: background .12s, border-color .12s, color .12s; }
    .btn:disabled { cursor: not-allowed; opacity: .6; }
    .btn--sm { height: 36px; padding: 0 13px; font-size: 13px; }
    .btn--block { width: 100%; }
    .btn--icon { width: 40px; padding: 0; }
    .btn--icon.btn--sm { width: 36px; }

    .btn--primary { background: var(--nx-indigo); color: #fff; box-shadow: var(--nx-shadow-primary); }
    .btn--primary:not(:disabled):hover { background: var(--nx-indigo-hover); }

    .btn--secondary { background: #fff; color: var(--nx-text-700); border-color: var(--nx-border); }
    .btn--secondary:not(:disabled):hover { background: var(--nx-surface-2); }

    .btn--outline { background: rgba(91,95,233,.06); color: var(--nx-indigo); border-color: var(--nx-indigo); }
    .btn--outline:not(:disabled):hover { background: rgba(91,95,233,.12); }

    .btn--ghost { background: transparent; color: var(--nx-text-500); }
    .btn--ghost:not(:disabled):hover { background: var(--nx-surface-2); }

    .btn--dashed { background: transparent; color: #7a7682; border: 1.5px dashed #d4d0c7; }
    .btn--dashed:not(:disabled):hover { background: var(--nx-surface-2); border-color: var(--nx-indigo); color: var(--nx-indigo); }

    .btn--danger { background: #fff; color: var(--nx-danger); border-color: #F2C4C0; }
    .btn--danger:not(:disabled):hover { background: rgba(245,86,78,.06); }
  `],
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'secondary';
  @Input() size: 'md' | 'sm' = 'md';
  @Input() icon = '';
  @Input() iconOnly = false;
  @Input() full = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';

  get iconSize(): number { return this.size === 'sm' ? 15 : 16; }
}
